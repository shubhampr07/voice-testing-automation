import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const conversation = await db.getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: conversation.id,
      persona: {
        name: conversation.persona.name,
        personaType: conversation.persona.personaType,
        age: conversation.persona.age,
        occupation: conversation.persona.occupation,
        communicationStyle: conversation.persona.communicationStyle,
      },
      metrics: {
        overallScore: conversation.overallScore,
        negotiationScore: conversation.negotiationScore,
        relevanceScore: conversation.relevanceScore,
      },
      messages: conversation.messages.map((msg) => ({
        turn: msg.turnNumber,
        speaker: msg.speaker.toLowerCase(),
        message: msg.content,
        timestamp: msg.createdAt,
      })),
      improvementSuggestions: conversation.improvementSuggestions,
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
