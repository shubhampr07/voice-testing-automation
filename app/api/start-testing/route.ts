import { NextRequest, NextResponse } from 'next/server';
import { TestingPlatform } from '@/lib/testing-platform';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numPersonas = 3, customScript } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const platform = new TestingPlatform(apiKey);

    // Run testing cycle
    const results = await platform.runFullTestingCycle(
      customScript,
      numPersonas
    );

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error running tests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run tests' },
      { status: 500 }
    );
  }
}
