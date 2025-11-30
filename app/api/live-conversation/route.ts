import { NextRequest } from 'next/server';
import { PersonaGenerator } from '@/lib/persona-generator';
import { MetricsAnalyzer } from '@/lib/metrics-analyzer';
import { SelfCorrectionEngine } from '@/lib/self-correction-engine';
import { DatabaseService } from '@/lib/database-service';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const searchParams = request.nextUrl.searchParams;
  const personaType = searchParams.get('personaType') || 'aggressive_denier';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'API key not configured' })}\n\n`)
          );
          controller.close();
          return;
        }

        // Initialize database service
        const databaseService = new DatabaseService();

        // Create database session
        const session = await databaseService.createSession(
          'VOICE',
          1, // Single persona for voice testing
          config.baseBotScript
        );
        const sessionId = session.id;

        // Send initial status
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'init', message: 'Starting voice testing cycle...', sessionId })}\n\n`)
        );

        // Generate persona ONCE
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Generating persona...' })}\n\n`)
        );

        const personaGenerator = new PersonaGenerator(apiKey);
        const persona = await personaGenerator.generatePersona(personaType);

        // Save persona to database
        const savedPersonas = await databaseService.savePersonas(sessionId, [persona]);
        const personaId = savedPersonas[0].id;

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'persona', data: persona })}\n\n`)
        );

        // Initialize analyzers
        const metricsAnalyzer = new MetricsAnalyzer(apiKey);
        const selfCorrectionEngine = new SelfCorrectionEngine(apiKey);

        let currentScript = config.baseBotScript;
        const maxIterations = config.maxIterations;
        const maxTurns = config.maxConversationTurns;
        const allIterationScores: number[] = [];

        // ITERATION LOOP
        for (let iteration = 1; iteration <= maxIterations; iteration++) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'iteration_start',
              iteration,
              message: `Starting iteration ${iteration}/${maxIterations}...`
            })}\n\n`)
          );

          // Run conversation for this iteration
          const conversation: any[] = [];
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: config.geminiModel });

          for (let turn = 0; turn < maxTurns; turn++) {
            // Bot's turn
            let botMessage: string;
            if (turn === 0) {
              botMessage = 'Hello, this is calling from the collections department regarding your account. May I speak with the account holder?';
            } else {
              const conversationHistory = conversation.map(c => `${c.speaker === 'bot' ? 'Bot' : 'Customer'}: ${c.message}`).join('\n');
              const prompt = `
You are a debt collection bot following this script:

${currentScript}

Conversation so far:
${conversationHistory}

Generate your next response as the bot. Be professional and empathetic.
Keep it concise (2-3 sentences max).
Return ONLY the message, no additional formatting.
`;

              const result = await model.generateContent(prompt);
              const response = await result.response;
              botMessage = response.text().trim();
            }

            conversation.push({ speaker: 'bot', message: botMessage, turn: turn + 1 });

            // Send bot message
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'message',
                speaker: 'bot',
                message: botMessage,
                turn: turn + 1,
                iteration
              })}\n\n`)
            );

            // Wait for TTS to play (5 seconds - allows voice to finish before next call)
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Customer's turn
            const conversationHistory = conversation.map(c => `${c.speaker === 'bot' ? 'Bot' : 'Customer'}: ${c.message}`).join('\n');
            const customerPrompt = `
You are roleplaying as a customer with the following persona:

Name: ${persona.name}
Type: ${persona.persona_type}
Communication Style: ${persona.communication_style}
Financial Situation: ${persona.financial_situation}
Attitude: ${persona.attitude_towards_debt}

Conversation so far:
${conversationHistory}

Respond naturally as this persona would. Keep it brief (1-2 sentences).
Return ONLY the message, no additional formatting.
`;

            const result2 = await model.generateContent(customerPrompt);
            const response2 = await result2.response;
            const customerMessage = response2.text().trim();

            conversation.push({ speaker: 'customer', message: customerMessage, turn: turn + 1 });

            // Send customer message
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'message',
                speaker: 'customer',
                message: customerMessage,
                turn: turn + 1,
                iteration
              })}\n\n`)
            );

            // Wait before next turn (5 seconds - allows voice to finish + rate limit protection)
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          // Analyze conversation
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'status',
              message: `Analyzing iteration ${iteration}...`
            })}\n\n`)
          );

          const analysis = await metricsAnalyzer.analyzeConversation(conversation, persona);
          allIterationScores.push(analysis.overall_score);

          // Save iteration to database
          const avgNegotiation = analysis.metrics.negotiation_effectiveness.score;
          const avgRelevance = analysis.metrics.response_relevance.score;

          const dbIteration = await databaseService.createIteration(
            sessionId,
            iteration,
            currentScript,
            analysis.overall_score,
            avgNegotiation,
            avgRelevance
          );

          // Save conversation to database
          await databaseService.saveConversation(
            sessionId,
            dbIteration.id,
            personaId,
            conversation,
            analysis
          );

          // Send iteration complete with metrics
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'iteration_complete',
              iteration,
              score: analysis.overall_score,
              metrics: {
                negotiation: analysis.metrics.negotiation_effectiveness.score,
                relevance: analysis.metrics.response_relevance.score,
              },
              message: `Iteration ${iteration} complete - Score: ${analysis.overall_score.toFixed(1)}/100`
            })}\n\n`)
          );

          // Check if we should stop
          if (analysis.overall_score >= config.minThresholdScore) {
            // Update session with final results
            const finalScore = analysis.overall_score;
            const initialScore = allIterationScores[0];
            const improvement = finalScore - initialScore;

            await databaseService.updateSessionResults(
              sessionId,
              finalScore,
              improvement,
              currentScript,
              iteration,
              true,
              initialScore
            );

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'success',
                message: `✓ Success! Score ${analysis.overall_score.toFixed(1)} reached threshold of ${config.minThresholdScore}`,
                finalScore: analysis.overall_score,
                sessionId
              })}\n\n`)
            );
            break;
          }

          // If not last iteration, improve script
          if (iteration < maxIterations) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                message: 'Analyzing performance and improving script...'
              })}\n\n`)
            );

            const proposedScript = await selfCorrectionEngine.improveScript(
              currentScript,
              [analysis],
              iteration
            );

            // Always use improved script if score is below threshold
            // This ensures continuous improvement attempts
            currentScript = proposedScript;
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'script_improved',
                iteration,
                message: `Script improved based on iteration ${iteration} feedback. Testing with iteration ${iteration + 1}...`,
                improvedScript: currentScript
              })}\n\n`)
            );
          } else {
            // Last iteration - update session with final results
            const finalScore = analysis.overall_score;
            const initialScore = allIterationScores[0];
            const improvement = finalScore - initialScore;

            await databaseService.updateSessionResults(
              sessionId,
              finalScore,
              improvement,
              currentScript,
              iteration,
              false,
              initialScore
            );

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'max_iterations',
                message: `Reached max iterations (${maxIterations}). Final score: ${analysis.overall_score.toFixed(1)}/100`,
                finalScore: analysis.overall_score,
                sessionId
              })}\n\n`)
            );
          }
        }

        // Send final completion
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'complete', message: 'Voice testing cycle complete', sessionId })}\n\n`)
        );

        controller.close();
      } catch (error: any) {
        console.error('Stream error:', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
