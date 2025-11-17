import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { transcribeVideo } from '@/lib/gemini';
import { saveTranscript } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskName, videoName } = body;

    if (!taskName || !videoName) {
      return NextResponse.json(
        { error: 'taskName and videoName are required' },
        { status: 400 }
      );
    }

    // Construct path to video file
    const videoPath = path.join(
      process.cwd(),
      'tasks',
      taskName,
      'video',
      videoName
    );

    // Transcribe video using Gemini
    const transcript = await transcribeVideo(videoPath);

    // Save transcript to transcribe/ folder and KV store
    // Remove .mp4 extension from videoName for storage
    const videoNameWithoutExt = videoName.replace(/\.(mp4|mov|avi)$/i, '');
    await saveTranscript(taskName, videoNameWithoutExt, transcript);

    return NextResponse.json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      {
        error: 'Failed to transcribe video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
