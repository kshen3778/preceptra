import { NextRequest, NextResponse } from 'next/server';
import { loadTranscripts, saveSOP } from '@/lib/storage';
import { summarizeTranscripts } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskName } = body;

    if (!taskName) {
      return NextResponse.json(
        { error: 'taskName is required' },
        { status: 400 }
      );
    }

    // Load all transcripts from Vercel KV
    const transcripts = await loadTranscripts(taskName);

    if (transcripts.length === 0) {
      return NextResponse.json(
        { error: 'No transcripts found for this task' },
        { status: 404 }
      );
    }

    // Generate SOP using Gemini
    const result = await summarizeTranscripts(transcripts);

    // Save SOP to file system
    await saveSOP(taskName, {
      markdown: result.markdown,
      notes: result.notes,
    });

    return NextResponse.json({
      success: true,
      markdown: result.markdown,
      notes: result.notes,
    });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate SOP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
