import { NextRequest, NextResponse } from 'next/server';
import { loadSOPs, getLatestSOP } from '@/lib/storage';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/sops?taskName=TaskName
 * Get all SOPs for a task, or the latest one if latest=true
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskName = searchParams.get('taskName');
    const latest = searchParams.get('latest') === 'true';

    if (!taskName) {
      return NextResponse.json(
        { error: 'taskName query parameter is required' },
        { status: 400 }
      );
    }

    if (latest) {
      const sop = await getLatestSOP(taskName);
      if (!sop) {
        return NextResponse.json(
          { error: 'No SOP found for this task' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        sop,
      });
    }

    const sops = await loadSOPs(taskName);
    return NextResponse.json({
      success: true,
      sops,
    });
  } catch (error) {
    console.error('Error loading SOPs:', error);
    return NextResponse.json(
      {
        error: 'Failed to load SOPs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

