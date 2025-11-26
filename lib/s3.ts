import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

export function getBucketName(): string {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME not configured in .env');
  }
  return bucketName;
}

/**
 * Upload a file buffer to S3
 * @param buffer File buffer
 * @param key S3 object key (path)
 * @param contentType MIME type
 * @returns S3 object key
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const bucketName = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);
  console.log(`[S3] File uploaded: ${key}`);
  return key;
}

/**
 * Get a file from S3 as a buffer
 * @param key S3 object key
 * @returns File buffer
 */
export async function getFromS3(key: string): Promise<Buffer> {
  const client = getS3Client();
  const bucketName = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await client.send(command);
  
  if (!response.Body) {
    throw new Error('No body in S3 response');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  
  console.log(`[S3] File downloaded: ${key} (${buffer.length} bytes)`);
  return buffer;
}

/**
 * Delete a file from S3
 * @param key S3 object key
 */
export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();
  const bucketName = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(command);
  console.log(`[S3] File deleted: ${key}`);
}

/**
 * Generate a unique S3 key for a video file
 * @param mimeType MIME type of the video
 * @returns S3 key
 */
export function generateS3Key(mimeType: string): string {
  const timestamp = Date.now();
  const extension = mimeType.includes('webm') ? 'webm' : 
                   mimeType.includes('quicktime') ? 'mov' :
                   mimeType.includes('x-msvideo') ? 'avi' : 'mp4';
  return `videos/temp/${timestamp}.${extension}`;
}

