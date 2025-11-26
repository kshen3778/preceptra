import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readPrompt, summarizeTranscripts } from '@/lib/gemini';

let genAI: GoogleGenerativeAI;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

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

    // Validate file type (check base MIME type, ignoring codecs parameter)
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const baseMimeType = videoFile.type.split(';')[0]; // Remove codecs parameter if present
    if (!allowedTypes.includes(baseMimeType)) {
      return NextResponse.json(
        { error: `Invalid file type. Only video files are allowed. Received: ${videoFile.type}` },
        { status: 400 }
      );
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 400 }
      );
    }

    const genAI = getGenAI();
    const modelName = getModelName();

    // Convert file to buffer for inline data (File API may not be available in all SDK versions)
    // We'll use inlineData but ensure we don't store the file locally
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const videoBase64 = buffer.toString('base64');

    console.log('[ProcessVideo] Processing video with Gemini...');

    // Step 1: Generate transcription
    const transcribePrompt = await readPrompt('transcribe');
    const model = genAI.getGenerativeModel({ model: modelName });

    const transcribeResult = await model.generateContent([
      {
        inlineData: {
          data: videoBase64,
          mimeType: videoFile.type,
        },
      },
      transcribePrompt,
    ]);

    const transcribeResponse = transcribeResult.response;
    const transcribeText = transcribeResponse.text();

    // Parse transcription JSON
    let transcript: any;
    try {
      const jsonMatch = transcribeText.match(/```json\s*([\s\S]*?)\s*```/) || transcribeText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : transcribeText;
      transcript = JSON.parse(jsonText);
      transcript.videoName = `recording-${Date.now()}`;
    } catch (error) {
      console.error('Failed to parse transcription:', transcribeText);
      throw new Error('Failed to parse transcription response');
    }

    console.log('[ProcessVideo] Transcription complete, generating SOP...');

    // Step 2: Generate SOP from transcription
    const sopResult = await summarizeTranscripts([transcript]);

    console.log('[ProcessVideo] SOP generation complete');

    return NextResponse.json({
      success: true,
      transcript,
      sop: {
        markdown: sopResult.markdown,
        notes: sopResult.notes,
      },
    });
  } catch (error) {
    console.error('Process video error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process video',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

