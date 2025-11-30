/**
 * Testing Platform with Database Integration
 * Saves all sessions, personas, iterations, conversations, and messages to PostgreSQL
 */

import { PersonaGenerator } from './persona-generator';
import { ConversationSimulator } from './conversation-simulator';
import { MetricsAnalyzer } from './metrics-analyzer';
import { SelfCorrectionEngine } from './self-correction-engine';
import { DatabaseService } from './database-service';
import { Persona, AnalysisResult, IterationResult, FinalReport } from './types';
import { config } from './config';

export class TestingPlatform {
  private personaGenerator: PersonaGenerator;
  private metricsAnalyzer: MetricsAnalyzer;
  private selfCorrectionEngine: SelfCorrectionEngine;
  private databaseService: DatabaseService;
  private apiKey: string;
  private sessionId: string | null = null;
  private sessionType: 'TEXT' | 'VOICE' = 'TEXT';
  private personaIdMap: Map<string, string> = new Map(); // persona.name -> db persona id

  constructor(apiKey: string, sessionType: 'TEXT' | 'VOICE' = 'TEXT') {
    this.apiKey = apiKey;
    this.sessionType = sessionType;
    this.personaGenerator = new PersonaGenerator(apiKey);
    this.metricsAnalyzer = new MetricsAnalyzer(apiKey);
    this.selfCorrectionEngine = new SelfCorrectionEngine(apiKey);
    this.databaseService = new DatabaseService();
  }

  async runFullTestingCycle(
    initialScript?: string,
    numPersonas: number = 3,
    onProgress?: (progress: {
      stage: string;
      iteration?: number;
      test?: number;
      totalTests?: number;
      message: string;
      data?: any;
    }) => void
  ): Promise<FinalReport & { sessionId: string }> {
    const currentScript = initialScript || config.baseBotScript;

    // Create database session
    const session = await this.databaseService.createSession(
      this.sessionType,
      numPersonas,
      currentScript
    );
    this.sessionId = session.id;

    onProgress?.({
      stage: 'init',
      message: `Starting testing cycle with ${numPersonas} personas`,
      data: { sessionId: this.sessionId },
    });

    // Generate personas
    onProgress?.({
      stage: 'personas',
      message: 'Generating test personas...',
    });

    const personas = await this.personaGenerator.generateMultiplePersonas(numPersonas);

    // Save personas to database
    const savedPersonas = await this.databaseService.savePersonas(this.sessionId, personas);
    savedPersonas.forEach((dbPersona, idx) => {
      this.personaIdMap.set(personas[idx].name, dbPersona.id);
    });

    onProgress?.({
      stage: 'personas',
      message: `Generated ${personas.length} personas`,
      data: { personas },
    });

    const allIterations: IterationResult[] = [];
    let script = currentScript;

    for (let iteration = 1; iteration <= config.maxIterations; iteration++) {
      onProgress?.({
        stage: 'iteration',
        iteration,
        message: `Starting iteration ${iteration}/${config.maxIterations}`,
      });

      const iterationResults = await this.runIteration(
        script,
        personas,
        iteration,
        (testProgress) => {
          onProgress?.({
            ...testProgress,
            iteration,
          });
        }
      );

      allIterations.push(iterationResults);

      onProgress?.({
        stage: 'iteration_complete',
        iteration,
        message: `Iteration ${iteration} complete. Score: ${iterationResults.average_score.toFixed(2)}/100`,
        data: { iterationResults },
      });

      // Check if threshold reached
      if (iterationResults.average_score >= config.minThresholdScore) {
        onProgress?.({
          stage: 'success',
          message: `Threshold reached! Final score: ${iterationResults.average_score.toFixed(2)}/100`,
        });
        break;
      }

      // Self-correct for next iteration
      if (iteration < config.maxIterations) {
        onProgress?.({
          stage: 'self_correction',
          iteration,
          message: 'Improving script based on test results...',
        });

        script = await this.selfCorrectionEngine.improveScript(
          script,
          iterationResults.test_results,
          iteration
        );

        onProgress?.({
          stage: 'self_correction_complete',
          iteration,
          message: 'Script improved',
          data: { improvedScript: script },
        });
      }
    }

    // Generate final report
    const finalReport = this.generateFinalReport(allIterations);

    // Update session with final results
    await this.databaseService.updateSessionResults(
      this.sessionId,
      finalReport.final_score,
      finalReport.improvement,
      script,
      finalReport.total_iterations,
      finalReport.threshold_reached,
      allIterations[0].average_score
    );

    onProgress?.({
      stage: 'complete',
      message: 'Testing cycle complete',
      data: { finalReport, sessionId: this.sessionId },
    });

    return {
      ...finalReport,
      sessionId: this.sessionId,
    };
  }

  private async runIteration(
    script: string,
    personas: Persona[],
    iteration: number,
    onProgress?: (progress: {
      stage: string;
      test?: number;
      totalTests?: number;
      message: string;
      data?: any;
    }) => void
  ): Promise<IterationResult> {
    const testResults: AnalysisResult[] = [];
    const conversations: any[] = [];

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];

      onProgress?.({
        stage: 'test',
        test: i + 1,
        totalTests: personas.length,
        message: `Testing with ${persona.name} (${persona.persona_type})`,
        data: { persona },
      });

      // Simulate conversation
      const simulator = new ConversationSimulator(this.apiKey, script);
      const conversation = await simulator.simulateConversation(persona);

      onProgress?.({
        stage: 'test_conversation',
        test: i + 1,
        totalTests: personas.length,
        message: `Conversation complete with ${persona.name}`,
        data: { conversation },
      });

      // Analyze conversation
      const analysis = await this.metricsAnalyzer.analyzeConversation(conversation, persona);

      onProgress?.({
        stage: 'test_analysis',
        test: i + 1,
        totalTests: personas.length,
        message: `Analysis complete. Score: ${analysis.overall_score.toFixed(2)}/100`,
        data: { analysis },
      });

      testResults.push(analysis);
      conversations.push({ persona, conversation, analysis });
    }

    // Calculate average scores
    const avgScore = testResults.reduce((sum, r) => sum + r.overall_score, 0) / testResults.length;
    const avgNegotiation =
      testResults.reduce((sum, r) => sum + r.metrics.negotiation_effectiveness.score, 0) /
      testResults.length;
    const avgRelevance =
      testResults.reduce((sum, r) => sum + r.metrics.response_relevance.score, 0) / testResults.length;

    // Save iteration to database
    const dbIteration = await this.databaseService.createIteration(
      this.sessionId!,
      iteration,
      script,
      avgScore,
      avgNegotiation,
      avgRelevance
    );

    // Save all conversations to database
    for (const { persona, conversation, analysis } of conversations) {
      const personaId = this.personaIdMap.get(persona.name);
      if (personaId) {
        await this.databaseService.saveConversation(
          this.sessionId!,
          dbIteration.id,
          personaId,
          conversation,
          analysis
        );
      }
    }

    return {
      iteration,
      script,
      test_results: testResults,
      average_score: avgScore,
      num_tests: testResults.length,
    };
  }

  private generateFinalReport(allIterations: IterationResult[]): FinalReport {
    const sessionId = this.sessionId || new Date().toISOString();
    const finalIteration = allIterations[allIterations.length - 1];
    const firstIteration = allIterations[0];

    return {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      total_iterations: allIterations.length,
      threshold_score: config.minThresholdScore,
      iterations: allIterations.map((iter) => ({
        iteration: iter.iteration,
        average_score: iter.average_score,
        num_tests: iter.num_tests,
      })),
      final_score: finalIteration.average_score,
      threshold_reached: finalIteration.average_score >= config.minThresholdScore,
      improvement: finalIteration.average_score - firstIteration.average_score,
    };
  }

  // Get session ID for external use
  getSessionId(): string | null {
    return this.sessionId;
  }
}
