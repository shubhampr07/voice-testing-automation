/**
 * Metrics Analyzer: Analyzes conversation quality and bot performance
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona, ConversationTurn, AnalysisResult } from './types';
import { config } from './config';

export class MetricsAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.geminiModel });
  }

  async analyzeConversation(conversation: ConversationTurn[], persona: Persona): Promise<AnalysisResult> {
    console.log('\nAnalyzing conversation metrics...');

    // Extract bot and customer messages
    const botMessages = conversation.filter(turn => turn.speaker === 'bot').map(turn => turn.message);
    const customerMessages = conversation.filter(turn => turn.speaker === 'customer').map(turn => turn.message);

    // Calculate two key metrics
    const negotiationScore = await this.analyzeNegotiation(conversation, persona);
    const relevanceScore = await this.analyzeRelevance(conversation);

    // Calculate weighted overall score (50% each)
    const overallScore =
      negotiationScore * config.metrics.negotiation_effectiveness.weight +
      relevanceScore * config.metrics.response_relevance.weight;

    const results: AnalysisResult = {
      metrics: {
        negotiation_effectiveness: {
          score: negotiationScore,
          weight: config.metrics.negotiation_effectiveness.weight,
          description: config.metrics.negotiation_effectiveness.description,
        },
        response_relevance: {
          score: relevanceScore,
          weight: config.metrics.response_relevance.weight,
          description: config.metrics.response_relevance.description,
        },
      },
      overall_score: Math.round(overallScore * 100) / 100,
      conversation_length: conversation.length,
      bot_message_count: botMessages.length,
      customer_message_count: customerMessages.length,
      improvement_suggestions: [],
    };

    // Get improvement suggestions
    results.improvement_suggestions = await this.getImprovementSuggestions(conversation, results);

    console.log(`Overall Score: ${results.overall_score}/100\n`);

    return results;
  }

  private async analyzeNegotiation(conversation: ConversationTurn[], persona: Persona): Promise<number> {
    const conversationText = conversation
      .map(turn => `${turn.speaker.toUpperCase()}: ${turn.message}`)
      .join('\n');

    const prompt = `
Analyze the negotiation effectiveness of this debt collection conversation:

${conversationText}

Customer Persona:
- Type: ${persona.persona_type}
- Financial Situation: ${persona.financial_situation}
- Preferred Outcome: ${persona.preferred_outcome}

Evaluate:
1. Did the bot attempt to understand the customer's situation?
2. Did the bot offer appropriate payment solutions?
3. Did the bot handle objections effectively?
4. Did the bot secure any commitment or next steps?
5. Was the bot too aggressive or too passive?

Return a JSON with:
{
  "negotiation_quality": "poor/fair/good/excellent",
  "commitment_secured": true/false,
  "payment_plan_offered": true/false,
  "empathy_shown": true/false,
  "score": 0-100,
  "explanation": "Brief explanation"
}

Return ONLY the JSON, no additional text.
`;

    try {

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const analysis = JSON.parse(text);
      return parseFloat(analysis.score) || 50;
    } catch (error) {
      console.error('Error analyzing negotiation:', error);
      return 50;
    }
  }

  private async analyzeRelevance(conversation: ConversationTurn[]): Promise<number> {
    const conversationText = conversation
      .map(turn => `${turn.speaker.toUpperCase()}: ${turn.message}`)
      .join('\n');

    const prompt = `
Analyze the relevance of bot responses in this conversation:

${conversationText}

Evaluate:
1. Does the bot address customer questions directly?
2. Does the bot stay on topic?
3. Does the bot provide irrelevant information?
4. Does the bot understand customer concerns?

Return a JSON with:
{
  "relevance_quality": "poor/fair/good/excellent",
  "off_topic_responses": 0-10,
  "unanswered_questions": 0-10,
  "score": 0-100,
  "explanation": "Brief explanation"
}

Return ONLY the JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const analysis = JSON.parse(text);
      return parseFloat(analysis.score) || 50;
    } catch (error) {
      console.error('Error analyzing relevance:', error);
      return 50;
    }
  }

  private async getImprovementSuggestions(
    conversation: ConversationTurn[],
    results: AnalysisResult
  ): Promise<string[]> {
    const conversationText = conversation
      .map(turn => `${turn.speaker.toUpperCase()}: ${turn.message}`)
      .join('\n');

    const metricsText = JSON.stringify(results.metrics, null, 2);

    const prompt = `
Based on this conversation and metrics analysis, provide specific improvement suggestions:

Conversation:
${conversationText}

Metrics:
${metricsText}

Overall Score: ${results.overall_score}/100

Provide 3-5 specific, actionable suggestions to improve the bot's script.
Focus on the weakest metrics.

Return a JSON array of suggestions:
{
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3"
  ]
}

Return ONLY the JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const analysis = JSON.parse(text);
      return analysis.suggestions || ['Unable to generate suggestions'];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return ['Unable to generate suggestions'];
    }
  }
}
