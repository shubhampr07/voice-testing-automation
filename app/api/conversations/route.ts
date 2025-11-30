import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const iterationNumber = searchParams.get('iteration');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const session = await db.getSessionDetails(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Find the specific iteration
    const iteration = session.iterations.find(
      (iter) => iter.iterationNumber === parseInt(iterationNumber || '1')
    );

    if (!iteration) {
      return NextResponse.json({ error: 'Iteration not found' }, { status: 404 });
    }

    // Format conversations with messages
    const conversations = iteration.conversations.map((conv) => ({
      id: conv.id,
      persona: {
        name: conv.persona.name,
        personaType: conv.persona.personaType,
        age: conv.persona.age,
        occupation: conv.persona.occupation,
        communicationStyle: conv.persona.communicationStyle,
      },
      metrics: {
        overallScore: conv.overallScore,
        negotiationScore: conv.negotiationScore,
        relevanceScore: conv.relevanceScore,
      },
      messages: conv.messages.map((msg) => ({
        turn: msg.turnNumber,
        speaker: msg.speaker.toLowerCase(),
        content: msg.content,
        timestamp: msg.createdAt,
      })),
      improvementSuggestions: conv.improvementSuggestions,
    }));

    return NextResponse.json({
      sessionId: session.id,
      iterationNumber: iteration.iterationNumber,
      averageScore: iteration.averageScore,
      conversations,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
