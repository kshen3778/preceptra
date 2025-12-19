import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readPrompt } from '@/lib/gemini';
import { getFromS3, deleteFromS3 } from '@/lib/s3';
import { getLatestSOP } from '@/lib/storage';

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
    const { s3Key: providedS3Key, mimeType, taskName, sop: providedSOP, stepIndex, stepContent, evaluationMode } = body;

    if (!providedS3Key || typeof providedS3Key !== 'string') {
      return NextResponse.json(
        { error: 'No S3 key provided. File must be uploaded to S3 first.' },
        { status: 400 }
      );
    }

    s3Key = providedS3Key;
    const baseMimeType = mimeType || 'video/mp4';

    console.log('[TribalFeedback] Fetching file from S3:', s3Key);
    console.log('[TribalFeedback] Task name:', taskName);
    console.log('[TribalFeedback] Has provided SOP:', !!providedSOP);

    const genAI = getGenAI();
    const modelName = getModelName();

    // Fetch file from S3
    const buffer = await getFromS3(providedS3Key);
    const fileBase64 = buffer.toString('base64');

    // Build context from provided SOP or load from storage
    let knowledgeContext = '';
    
    if (providedSOP) {
      // Use provided SOP (from try page)
      if (providedSOP.markdown) {
        knowledgeContext += `## Procedural Knowledge\n\n${providedSOP.markdown}\n\n`;
      }
    } else if (taskName) {
      // Load from storage (for workflow page)
      console.log('[TribalFeedback] Loading SOP for taskName:', taskName);
      console.log('[TribalFeedback] TaskName type:', typeof taskName);
      const latestSOP = await getLatestSOP(taskName);

      console.log('[TribalFeedback] Latest SOP loaded from storage:', latestSOP ? 'Yes' : 'No');
      if (latestSOP) {
        console.log('[TribalFeedback] Loaded SOP taskName:', latestSOP.taskName);
      }

      if (!latestSOP) {
        return NextResponse.json(
          { error: 'No procedural knowledge found for this task. Please add content first.' },
          { status: 404 }
        );
      }
      
      if (latestSOP) {
        knowledgeContext += `## Procedural Knowledge\n\n${latestSOP.markdown}\n\n`;
      }
    } else {
      return NextResponse.json(
        { error: 'Either SOP must be provided, or taskName must be provided to load from storage.' },
        { status: 400 }
      );
    }

    if (!knowledgeContext) {
      return NextResponse.json(
        { error: 'No procedural knowledge found. Please add content first.' },
        { status: 404 }
      );
    }

    // Read the feedback prompt
    let feedbackPrompt = await readPrompt('tribal-feedback');
    
    // Modify prompt based on evaluation mode
    if (evaluationMode === 'step-by-step' && stepIndex !== undefined && stepContent) {
      // Step-by-step evaluation: focus only on the specific step
      feedbackPrompt = `You are analyzing a video of someone performing a SPECIFIC STEP of a task and providing feedback based on established procedural knowledge.

Objective:
Compare the person's performance in the video against ONLY the specific step provided below. Provide focused feedback on:
- How well they followed this specific step
- Any aspects of this step they missed or did incorrectly
- Areas where they could improve for this step
- What they did well for this step
- Any safety concerns or best practices specific to this step

IMPORTANT: Only evaluate the specific step provided below. Do not evaluate other steps or the entire procedure. Focus your feedback exclusively on this one step.

## Step to Evaluate

${stepContent}

${feedbackPrompt.split('Objective:')[1]}`;
    }
    
    // Combine prompt with knowledge context
    const fullPrompt = `${feedbackPrompt}\n\n## Knowledge Base\n\n${knowledgeContext}\n\nNow analyze the provided video and provide feedback based on the knowledge base above.`;

    console.log('[TribalFeedback] Processing video with Gemini...');

    const model = genAI.getGenerativeModel({ 
      model: modelName,
    });

    let feedbackResult;
    try {
      feedbackResult = await model.generateContent([
        {
          inlineData: {
            data: fileBase64,
            mimeType: baseMimeType,
          },
        },
        fullPrompt,
      ]);
    } catch (apiError: any) {
      console.error('[TribalFeedback] Gemini API error:', apiError);
      const errorMessage = apiError?.message || apiError?.toString() || 'Unknown API error';
      throw new Error(`Gemini API error: ${errorMessage}. This might be due to video size limits, API quota, or network issues.`);
    }

    const feedbackResponse = feedbackResult.response;
    
    if (!feedbackResponse || !feedbackResponse.text) {
      console.error('[TribalFeedback] Invalid response from Gemini:', feedbackResponse);
      throw new Error('Invalid response from Gemini API');
    }
    
    const feedbackText = feedbackResponse.text();

    console.log('[TribalFeedback] Feedback generation complete');

    // Clean up: Delete the file from S3
    if (s3Key) {
      try {
        await deleteFromS3(s3Key);
        console.log('[TribalFeedback] File deleted from S3');
      } catch (deleteError) {
        console.warn('[TribalFeedback] Failed to delete file from S3:', deleteError);
        // Don't fail the request if deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackText,
    });
  } catch (error) {
    // Try to clean up S3 file even on error
    if (s3Key) {
      try {
        await deleteFromS3(s3Key);
        console.log('[TribalFeedback] Cleaned up S3 file after error');
      } catch (deleteError) {
        console.warn('[TribalFeedback] Failed to clean up S3 file:', deleteError);
      }
    }

    console.error('Tribal feedback error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate feedback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

