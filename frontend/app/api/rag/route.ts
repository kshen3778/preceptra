import { NextRequest, NextResponse } from 'next/server';
import { loadTranscripts, getLatestSOP } from '@/lib/storage';
import { answerQuestion } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskName, question, media } = body;

    if (!taskName || !question) {
      return NextResponse.json(
        { error: 'taskName and question are required' },
        { status: 400 }
      );
    }

    // Load all transcripts from Vercel KV
    const transcripts = await loadTranscripts(taskName);

    // Load the latest SOP if available
    const latestSOP = await getLatestSOP(taskName);
    console.log('[RAG] Transcripts loaded:', transcripts.length);
    console.log('[RAG] Latest SOP loaded:', latestSOP ? 'Yes' : 'No');
    console.log('[RAG] Media attachments:', media ? media.length : 0);

    // Require either transcripts or SOP to be available
    if (transcripts.length === 0 && !latestSOP) {
      return NextResponse.json(
        { error: 'No transcripts or procedure found for this task' },
        { status: 404 }
      );
    }

    // Answer question using RAG with SOP context and media (base64)
    const result = await answerQuestion(question, transcripts, 5, latestSOP, media);

    return NextResponse.json({
      success: true,
      markdown: result.markdown,
      sources: result.sources,
    });
  } catch (error) {
    console.error('RAG error:', error);
    return NextResponse.json(
      {
        error: 'Failed to answer question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
