import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, generateS3Key } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mimeType, fileSize } = body;

    if (!mimeType) {
      return NextResponse.json(
        { error: 'MIME type is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const baseMimeType = mimeType.split(';')[0];
    if (!allowedTypes.includes(baseMimeType)) {
      return NextResponse.json(
        { error: `Invalid file type. Only video files are allowed. Received: ${mimeType}` },
        { status: 400 }
      );
    }

    // Validate file size (Gemini supports up to 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 2GB limit' },
        { status: 400 }
      );
    }

    // Generate S3 key
    const s3Key = generateS3Key(baseMimeType);

    // Generate presigned URL for direct upload (expires in 5 minutes)
    const presignedUrl = await getPresignedUploadUrl(s3Key, baseMimeType, 300);

    console.log('[UploadToS3] Generated presigned URL for:', s3Key);

    return NextResponse.json({
      success: true,
      s3Key: s3Key,
      presignedUrl: presignedUrl,
      mimeType: baseMimeType,
    });
  } catch (error) {
    console.error('[UploadToS3] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

