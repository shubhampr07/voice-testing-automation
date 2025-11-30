/**
 * Database Service: Handles all database operations for testing sessions
 */

import { prisma } from './prisma';
import { Persona, ConversationTurn, AnalysisResult } from './types';

export class DatabaseService {
  // Create a new testing session
  async createSession(sessionType: 'TEXT' | 'VOICE', numPersonas: number, initialScript: string) {
    return await prisma.testingSession.create({
      data: {
        sessionType,
        numPersonas,
        initialScript,
      },
    });
  }

  // Save generated personas
  async savePersonas(sessionId: string, personas: Persona[]) {
    const personaRecords = await Promise.all(
      personas.map((persona) =>
        prisma.persona.create({
          data: {
            sessionId,
            name: persona.name,
            age: persona.age,
            occupation: persona.occupation,
            personaType: persona.persona_type,
            financialSituation: persona.financial_situation,
            personalityTraits: persona.personality_traits,
            communicationStyle: persona.communication_style,
            reasonForDefault: persona.reason_for_default,
            attitudeTowardsDebt: persona.attitude_towards_debt,
            likelyResponses: persona.likely_responses,
            negotiationApproach: persona.negotiation_approach,
            painPoints: persona.pain_points,
            triggers: persona.triggers,
            preferredOutcome: persona.preferred_outcome,
          },
        })
      )
    );

    return personaRecords;
  }

  // Create an iteration
  async createIteration(
    sessionId: string,
    iterationNumber: number,
    botScript: string,
    averageScore: number,
    avgNegotiation: number,
    avgRelevance: number
  ) {
    return await prisma.iteration.create({
      data: {
        sessionId,
        iterationNumber,
        botScript,
        averageScore,
        avgNegotiation,
        avgRelevance,
      },
    });
  }

  // Save a conversation with all messages
  async saveConversation(
    sessionId: string,
    iterationId: string,
    personaId: string,
    conversation: ConversationTurn[],
    analysis: AnalysisResult
  ) {
    const conversationRecord = await prisma.conversation.create({
      data: {
        sessionId,
        iterationId,
        personaId,
        turnCount: conversation.length,
        botMessageCount: analysis.bot_message_count,
        customerMessageCount: analysis.customer_message_count,
        overallScore: analysis.overall_score,
        negotiationScore: analysis.metrics.negotiation_effectiveness.score,
        relevanceScore: analysis.metrics.response_relevance.score,
        improvementSuggestions: analysis.improvement_suggestions,
        messages: {
          create: conversation.map((turn) => ({
            turnNumber: turn.turn,
            speaker: turn.speaker === 'bot' ? 'BOT' : 'CUSTOMER',
            content: turn.message,
          })),
        },
      },
      include: {
        messages: true,
      },
    });

    return conversationRecord;
  }

  // Update session with final results
  async updateSessionResults(sessionId: string, finalScore: number, improvement: number, finalScript: string, totalIterations: number, thresholdReached: boolean, initialScore: number) {
    return await prisma.testingSession.update({
      where: { id: sessionId },
      data: {
        finalScript,
        initialScore,
        finalScore,
        improvement,
        thresholdReached,
        totalIterations,
      },
    });
  }

  // Get all sessions
  async getAllSessions() {
    return await prisma.testingSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            personas: true,
            iterations: true,
          },
        },
      },
    });
  }

  // Get session with all details
  async getSessionDetails(sessionId: string) {
    return await prisma.testingSession.findUnique({
      where: { id: sessionId },
      include: {
        personas: true,
        iterations: {
          orderBy: { iterationNumber: 'asc' },
          include: {
            conversations: {
              include: {
                persona: true,
                messages: {
                  orderBy: { turnNumber: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  }

  // Get conversation with messages
  async getConversation(conversationId: string) {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        persona: true,
        messages: {
          orderBy: { turnNumber: 'asc' },
        },
      },
    });
  }
}
