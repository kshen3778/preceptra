import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readPrompt, summarizeTranscripts } from '@/lib/gemini';
import { getFromS3, deleteFromS3 } from '@/lib/s3';

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
  let s3Key: string | null = null;
  
  try {
    const body = await request.json();
    const { s3Key: providedS3Key, mimeType } = body;

    if (!providedS3Key || typeof providedS3Key !== 'string') {
      return NextResponse.json(
        { error: 'No S3 key provided. File must be uploaded to S3 first.' },
        { status: 400 }
      );
    }

    s3Key = providedS3Key;
    const baseMimeType = mimeType || 'video/mp4';

    console.log('[ProcessVideo] Fetching video from S3:', s3Key);

    const genAI = getGenAI();
    const modelName = getModelName();

    // Fetch file from S3
    const buffer = await getFromS3(providedS3Key);
    const videoBase64 = buffer.toString('base64');

    console.log('[ProcessVideo] Processing video with Gemini...');

    // Step 1: Generate transcription
    const transcribePrompt = await readPrompt('transcribe');
    const model = genAI.getGenerativeModel({ 
      model: modelName,
    });

    let transcribeResult;
    try {
      transcribeResult = await model.generateContent([
        {
          inlineData: {
            data: videoBase64,
            mimeType: baseMimeType,
          },
        },
        transcribePrompt,
      ]);
    } catch (apiError: any) {
      console.error('[ProcessVideo] Gemini API error:', apiError);
      const errorMessage = apiError?.message || apiError?.toString() || 'Unknown API error';
      throw new Error(`Gemini API error: ${errorMessage}. This might be due to video size limits, API quota, or network issues.`);
    }

    const transcribeResponse = transcribeResult.response;
    
    // Check if response indicates an error
    if (!transcribeResponse || !transcribeResponse.text) {
      console.error('[ProcessVideo] Invalid response from Gemini:', transcribeResponse);
      throw new Error('Invalid response from Gemini API');
    }
    
    let transcribeText: string;
    try {
      transcribeText = transcribeResponse.text();
    } catch (textError: any) {
      console.error('[ProcessVideo] Error getting text from response:', textError);
      throw new Error(`Failed to get response text: ${textError?.message || 'Unknown error'}`);
    }

    // Check if response is an error message before trying to parse JSON
    const trimmedText = transcribeText.trim();
    if (trimmedText.startsWith('Request Error') || 
        trimmedText.startsWith('Error') || 
        trimmedText.startsWith('Failed') ||
        trimmedText.toLowerCase().includes('error') && !trimmedText.includes('{')) {
      console.error('[ProcessVideo] Gemini returned an error response:', trimmedText);
      throw new Error(`Gemini API error: ${trimmedText.substring(0, 200)}`);
    }

    // Parse transcription JSON
    let transcript: any;
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonText = trimmedText;
      const jsonMatch = transcribeText.match(/```json\s*([\s\S]*?)\s*```/) || transcribeText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      // Find the JSON object by looking for balanced braces
      let jsonStart = jsonText.indexOf('{');
      if (jsonStart === -1) {
        // If no JSON found, check if it's an error message
        if (jsonText.toLowerCase().includes('error') || jsonText.toLowerCase().includes('failed')) {
          throw new Error(`Gemini returned an error: ${jsonText.substring(0, 200)}`);
        }
        throw new Error('No JSON object found in response. Response: ' + jsonText.substring(0, 200));
      }
      
      // Find the matching closing brace
      let braceCount = 0;
      let jsonEnd = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = jsonStart; i < jsonText.length; i++) {
        const char = jsonText[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
      }
      
      if (jsonEnd === -1) {
        jsonEnd = jsonText.length;
      }
      
      jsonText = jsonText.substring(jsonStart, jsonEnd);
      transcript = JSON.parse(jsonText);
      transcript.videoName = `recording-${Date.now()}`;
    } catch (error) {
      console.error('[ProcessVideo] Failed to parse transcription:', error);
      console.error('[ProcessVideo] Full response text:', transcribeText);
      console.error('[ProcessVideo] Response length:', transcribeText.length);
      
      // Provide more helpful error message
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        throw new Error(`Failed to parse transcription: Gemini returned invalid JSON. Response preview: ${transcribeText.substring(0, 300)}`);
      }
      throw new Error(`Failed to parse transcription response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[ProcessVideo] Transcription complete, generating SOP...');

    // Step 2: Generate SOP from transcription
    const sopResult = await summarizeTranscripts([transcript]);

    console.log('[ProcessVideo] SOP generation complete');

    // Clean up: Delete the file from S3
    if (s3Key) {
      try {
        await deleteFromS3(s3Key);
        console.log('[ProcessVideo] File deleted from S3');
      } catch (deleteError) {
        console.warn('[ProcessVideo] Failed to delete file from S3:', deleteError);
        // Don't fail the request if deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      transcript,
      sop: {
        markdown: sopResult.markdown,
        notes: sopResult.notes,
      },
    });
  } catch (error) {
    // Try to clean up S3 file even on error
    if (s3Key) {
      try {
        await deleteFromS3(s3Key);
        console.log('[ProcessVideo] Cleaned up S3 file after error');
      } catch (deleteError) {
        console.warn('[ProcessVideo] Failed to clean up S3 file:', deleteError);
      }
    }

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

