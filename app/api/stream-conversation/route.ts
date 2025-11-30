import { NextRequest } from 'next/server';
import { TestingPlatform } from '@/lib/testing-platform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const searchParams = request.nextUrl.searchParams;
  const numPersonas = parseInt(searchParams.get('numPersonas') || '3');

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'API key not configured' })}\n\n`)
          );
          controller.close();
          return;
        }

        const platform = new TestingPlatform(apiKey);

        // Run testing with progress updates
        await platform.runFullTestingCycle(
          undefined,
          numPersonas,
          (progress) => {
            // Send progress update to client
            const data = {
              type: progress.stage,
              iteration: progress.iteration,
              test: progress.test,
              totalTests: progress.totalTests,
              message: progress.message,
              data: progress.data,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        );

        controller.close();
      } catch (error: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
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
