import { NextRequest, NextResponse } from 'next/server';
import { PersonaGenerator } from '@/lib/persona-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 3 } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const generator = new PersonaGenerator(apiKey);
    
    // Generate loan defaulter personas
    const personas = await generator.generateMultiplePersonas(count);

    return NextResponse.json({ personas });
  } catch (error: any) {
    console.error('Error generating personas:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate personas' },
      { status: 500 }
    );
  }
}
