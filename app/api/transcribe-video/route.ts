import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { transcribeVideo } from '@/lib/gemini';
import { transcriptExists } from '@/lib/storage';
// import { saveTranscript } from '@/lib/storage'; // Disabled in demo mode

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

    // Check if transcript already exists - prevent re-transcription
    // transcriptExists checks both file system and KV store
    const videoNameWithoutExt = videoName.replace(/\.(mp4|mov|avi)$/i, '');
    const exists = await transcriptExists(taskName, videoNameWithoutExt);
    
    if (exists) {
      return NextResponse.json(
        { error: 'This video has already been transcribed' },
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

    // DEMO MODE: Do not save transcript to transcribe/ folder and KV store
    // await saveTranscript(taskName, videoNameWithoutExt, transcript);

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
