import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3, generateS3Key } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const baseMimeType = videoFile.type.split(';')[0];
    if (!allowedTypes.includes(baseMimeType)) {
      return NextResponse.json(
        { error: `Invalid file type. Only video files are allowed. Received: ${videoFile.type}` },
        { status: 400 }
      );
    }

    // Validate file size (Gemini supports up to 2GB, but we'll set a reasonable limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 2GB limit' },
        { status: 400 }
      );
    }

    console.log('[UploadToS3] Uploading file to S3...');
    console.log('[UploadToS3] File size:', (videoFile.size / (1024 * 1024)).toFixed(2), 'MB');

    // Convert file to buffer
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate S3 key and upload
    const s3Key = generateS3Key(baseMimeType);
    await uploadToS3(buffer, s3Key, baseMimeType);

    console.log('[UploadToS3] File uploaded successfully:', s3Key);

    return NextResponse.json({
      success: true,
      s3Key: s3Key,
      mimeType: baseMimeType,
    });
  } catch (error) {
    console.error('[UploadToS3] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file to S3',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

