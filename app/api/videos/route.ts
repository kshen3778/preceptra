import { NextRequest, NextResponse } from 'next/server';
import { listVideos, transcriptExists } from '@/lib/storage';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskName = searchParams.get('taskName');

    if (!taskName) {
      return NextResponse.json(
        { error: 'taskName parameter is required' },
        { status: 400 }
      );
    }

    const videoNames = await listVideos(taskName);

    // Check which videos have been transcribed
    // Remove extension from video name for transcript check
    const videos = await Promise.all(
      videoNames.map(async (name) => {
        try {
          const nameWithoutExt = name.replace(/\.(mp4|mov|avi)$/i, '');
          const transcribed = await transcriptExists(taskName, nameWithoutExt);
          return {
            name,
            transcribed,
          };
        } catch (error) {
          // If check fails, assume not transcribed
          console.error(`Error checking transcript for ${name}:`, error);
          return {
            name,
            transcribed: false,
          };
        }
      })
    );

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Failed to list videos:', error);
    return NextResponse.json(
      { error: 'Failed to list videos' },
      { status: 500 }
    );
  }
}
