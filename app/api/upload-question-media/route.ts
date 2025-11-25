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

    // Validate file type (images and videos)
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const allowedTypes = [...imageTypes, ...videoTypes];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MPEG, MOV, AVI, WebM) are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for images, 500MB for videos)
    const isVideo = videoTypes.includes(file.type);
    const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${isVideo ? '500MB' : '100MB'} limit` },
        { status: 400 }
      );
    }

    // Create question-media directory if it doesn't exist
    const mediaDir = path.join(process.cwd(), 'tasks', taskName, 'question-media');
    await mkdir(mediaDir, { recursive: true });

    // Get file extension and create safe filename with timestamp
    const fileExtension = path.extname(file.name);
    const baseName = path.basename(file.name, fileExtension);
    const timestamp = Date.now();
    // Sanitize filename
    const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}_${timestamp}${fileExtension}`;
    const filePath = path.join(mediaDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`[Upload] Question media saved to: ${filePath}`);

    return NextResponse.json({
      success: true,
      fileName,
      fileType: isVideo ? 'video' : 'image',
      url: `/api/question-media/${taskName}/${fileName}`,
      message: 'Media uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload media',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
