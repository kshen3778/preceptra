import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, sop, question, media } = body;

    if (!transcript || !question) {
      return NextResponse.json(
        { error: 'transcript and question are required' },
        { status: 400 }
      );
    }

    // Answer question using RAG with the provided transcript and SOP
    const result = await answerQuestion(
      question,
      [transcript], // Single transcript in array
      5,
      sop || null,
      media
    );

    return NextResponse.json({
      success: true,
      markdown: result.markdown,
      sources: result.sources,
    });
  } catch (error) {
    console.error('Ask question error:', error);
    return NextResponse.json(
      {
        error: 'Failed to answer question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

