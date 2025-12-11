import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const taskName = formData.get('taskName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!taskName) {
      return NextResponse.json(
        { error: 'taskName is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4, MPEG, MOV, and AVI files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (e.g., max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
      );
    }

    // Create video directory if it doesn't exist
    const videoDir = path.join(process.cwd(), 'tasks', taskName, 'video');
    await mkdir(videoDir, { recursive: true });

    // Get file extension and create safe filename
    const fileExtension = path.extname(file.name);
    const baseName = path.basename(file.name, fileExtension);
    // Sanitize filename
    const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}${fileExtension}`;
    const filePath = path.join(videoDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`[Upload] Video saved to: ${filePath}`);

    return NextResponse.json({
      success: true,
      fileName,
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

