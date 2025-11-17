import { NextRequest, NextResponse } from 'next/server';
import { listTasks } from '@/lib/storage';
import { mkdir } from 'fs/promises';
import path from 'path';

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

    // Sanitize task name to be filesystem-safe
    const sanitizedTaskName = taskName.replace(/[^a-zA-Z0-9_-]/g, '_').trim();

    if (!sanitizedTaskName || sanitizedTaskName.length === 0) {
      return NextResponse.json(
        { error: 'Invalid task name' },
        { status: 400 }
      );
    }

    // Create task directory structure
    const taskDir = path.join(process.cwd(), 'tasks', sanitizedTaskName);
    const videoDir = path.join(taskDir, 'video');
    const transcribeDir = path.join(taskDir, 'transcribe');
    const sopDir = path.join(taskDir, 'sop');

    // Create directories (recursive will create parent if needed)
    await mkdir(videoDir, { recursive: true });
    await mkdir(transcribeDir, { recursive: true });
    await mkdir(sopDir, { recursive: true });

    console.log(`[Tasks] Created task folder: ${taskDir}`);

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
