import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    const db = new DatabaseService();

    if (sessionId) {
      // Get specific session details
      const session = await db.getSessionDetails(sessionId);
      
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Transform to frontend format
      const iterations = session.iterations.map((iter: any) => ({
        iteration: iter.iterationNumber,
        average_score: iter.averageScore,
        test_results: iter.conversations.map((conv: any) => ({
          persona: {
            name: conv.persona.name,
            persona_type: conv.persona.personaType,
          },
          analysis: {
            overall_score: conv.overallScore,
            metrics: {
              negotiation_effectiveness: {
                score: conv.negotiationScore,
              },
              response_relevance: {
                score: conv.relevanceScore,
              },
            },
          },
        })),
      }));

      return NextResponse.json({
        sessionId: session.id,
        sessionType: session.sessionType,
        createdAt: session.createdAt,
        iterations,
        finalScore: session.finalScore,
        initialScore: session.initialScore,
        improvement: session.improvement,
        thresholdReached: session.thresholdReached,
      });
    } else {
      // Get all sessions (only TEXT sessions for Results tab)
      const allSessions = await db.getAllSessions();
      
      // Filter to only show TEXT sessions
      const textSessions = allSessions.filter((s: any) => s.sessionType === 'TEXT');

      return NextResponse.json({
        sessions: textSessions.map((s: any) => ({
          id: s.id,
          sessionType: s.sessionType,
          createdAt: s.createdAt,
          numPersonas: s.numPersonas,
          finalScore: s.finalScore,
          initialScore: s.initialScore,
          improvement: s.improvement,
          thresholdReached: s.thresholdReached,
          totalIterations: s.totalIterations,
          _count: s._count,
        })),
      });
    }
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
