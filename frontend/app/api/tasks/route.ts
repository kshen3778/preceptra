import { NextRequest, NextResponse } from 'next/server';
import { listTasks } from '@/lib/storage';

export async function GET() {
  try {
    const tasks = await listTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to list tasks:', error);
    return NextResponse.json(
      { error: 'Failed to list tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { taskName } = await request.json();

    if (!taskName || typeof taskName !== 'string') {
      return NextResponse.json(
        { error: 'taskName is required and must be a string' },
        { status: 400 }
      );
    }

    // Sanitize task name
    const sanitizedTaskName = taskName.trim();

    if (!sanitizedTaskName || sanitizedTaskName.length === 0) {
      return NextResponse.json(
        { error: 'Invalid task name' },
        { status: 400 }
      );
    }

    // Just return the task name without creating folders
    console.log(`[Tasks] Created task: ${sanitizedTaskName}`);

    return NextResponse.json({
      success: true,
      taskName: sanitizedTaskName,
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create task',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
