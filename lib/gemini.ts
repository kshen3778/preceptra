import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

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

/**
 * Get the Gemini model name from environment variable or use default
 */
function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

/**
 * Read prompt file from the prompts directory
 * @param promptName - Name of the prompt file (without .txt extension)
 * @returns Prompt text content
 */
export async function readPrompt(promptName: string): Promise<string> {
  const promptPath = path.join(process.cwd(), 'prompts', `${promptName}.txt`);
  return await fs.readFile(promptPath, 'utf-8');
}

/**
 * Transcribe a video file using Gemini
 * @param videoPath - Absolute path to the video file
 * @returns Transcript JSON object
 */
export async function transcribeVideo(videoPath: string): Promise<any> {
  const model = getGenAI().getGenerativeModel({ model: getModelName() });

  // Read the prompt
  const prompt = await readPrompt('transcribe');

  // Read video file
  const videoData = await fs.readFile(videoPath);
  const videoBase64 = videoData.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        data: videoBase64,
        mimeType: 'video/mp4',
      },
    },
    prompt,
  ]);

  const response = result.response;
  const text = response.text();

  // Parse JSON response
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse Gemini response as JSON:', text);
    throw new Error('Gemini did not return valid JSON');
  }
}

/**
 * Generate a consolidated SOP from multiple transcripts
 * @param transcripts - Array of transcript objects
 * @returns Object containing markdown SOP and notes
 */
export async function summarizeTranscripts(transcripts: any[]): Promise<{
  markdown: string;
  notes: string;
}> {
  console.log('[Summarize] Starting SOP generation...');
  console.log('[Summarize] Number of transcripts:', transcripts.length);
  
  // Log transcript summary
  transcripts.forEach((t, idx) => {
    const audioSegments = t.audio_transcript?.length || t.segments?.length || 0;
    const visualSegments = t.visual_description?.length || 0;
    const videoName = t.videoName || 'unknown';
    console.log(`[Summarize] Transcript ${idx + 1}: ${videoName} - ${audioSegments} audio segments, ${visualSegments} visual segments`);
  });

  const modelName = getModelName();
  console.log('[Summarize] Using model:', modelName);
  
  // Use plain text model - no JSON enforcement
  const model = getGenAI().getGenerativeModel({ 
    model: modelName,
  });

  // Read the prompt
  const prompt = await readPrompt('summarize');
  console.log('[Summarize] Prompt loaded, length:', prompt.length, 'chars');
  console.log('[Summarize] Prompt preview (first 200 chars):', prompt.substring(0, 200));

  // Format transcripts for the model
  const transcriptsText = JSON.stringify(transcripts, null, 2);
  console.log('[Summarize] Transcripts JSON size:', transcriptsText.length, 'chars');
  console.log('[Summarize] Sending request to Gemini...');

  const startTime = Date.now();
  const result = await model.generateContent([
    prompt,
    '\n\nTranscripts:\n',
    transcriptsText,
  ]);
  const duration = Date.now() - startTime;
  console.log(`[Summarize] Gemini response received in ${duration}ms`);

  const response = result.response;
  const text = response.text();
  console.log('[Summarize] Raw response length:', text.length, 'chars');
  console.log('[Summarize] Raw response preview (first 500 chars):', text.substring(0, 500));
  if (text.length > 500) {
    console.log('[Summarize] Raw response ending (last 500 chars):', text.substring(Math.max(0, text.length - 500)));
  }

  // Extract markdown content directly (no JSON parsing needed)
  try {
    let markdown = text.trim();
    
    // Remove markdown code blocks if present
    const codeBlockMatch = markdown.match(/```(?:markdown)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      markdown = codeBlockMatch[1].trim();
    }
    
    // Extract notes section if present
    let notes = '';
    const notesMatch = markdown.match(/##\s+Notes?\s*\n\n([\s\S]*?)(?=\n##|$)/i) || 
                      markdown.match(/##\s+Additional\s+Observations\s*\n\n([\s\S]*?)(?=\n##|$)/i);
    if (notesMatch) {
      notes = notesMatch[1].trim();
      // Remove notes section from markdown
      markdown = markdown.replace(/##\s+Notes?\s*\n\n[\s\S]*?(?=\n##|$)/i, '').trim();
      markdown = markdown.replace(/##\s+Additional\s+Observations\s*\n\n[\s\S]*?(?=\n##|$)/i, '').trim();
    }
    
    console.log('[Summarize] Extracted markdown, length:', markdown.length, 'chars');
    console.log('[Summarize] Extracted notes, length:', notes.length, 'chars');
    console.log('[Summarize] SOP generation completed successfully');

    return {
      markdown: markdown || text.trim(),
      notes: notes,
    };
  } catch (error) {
    console.error('[Summarize] ERROR: Failed to extract content from response');
    console.error('[Summarize] Raw response text (full):', text);
    if (error instanceof Error) {
      console.error('[Summarize] Error message:', error.message);
    }
    
    // Final fallback: return the raw text
    return {
      markdown: text.trim(),
      notes: '',
    };
  }
}

/**
 * Fix common JSON issues like unescaped quotes in strings
 * This handles cases where Gemini generates JSON with unescaped quotes inside string values
 * Strategy: When inside a string, escape quotes unless they're clearly followed by JSON structure
 */
function fixJSONString(jsonText: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonText.length; i++) {
    const char = jsonText[i];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      if (!inString) {
        // Starting a new string
        inString = true;
        result += char;
      } else {
        // We're inside a string value - need to determine if this quote ends it
        const lookAhead = jsonText.substring(i + 1, Math.min(i + 50, jsonText.length));
        const trimmedLookAhead = lookAhead.trim();
        
        // Check if quote is followed by clear JSON structure (not content)
        // Pattern 1: quote, whitespace, comma, whitespace, quote (new field: "key": "value")
        // Pattern 2: quote, whitespace, comma, whitespace, closing brace/bracket
        // Pattern 3: quote, whitespace, closing brace/bracket (end of object/array)
        // Pattern 4: quote at end of input
        
        // If we see letters/numbers after the quote (after whitespace), it's likely content
        const hasContentAfter = /^\s*[a-zA-Z0-9]/.test(lookAhead);
        
        // Clear end-of-string patterns
        const isEndOfString = 
          /^\s*,\s*"/.test(trimmedLookAhead) ||     // Comma then quote (new field)
          /^\s*,\s*[}\]]/.test(trimmedLookAhead) || // Comma then closing brace/bracket
          /^\s*[}\]]/.test(trimmedLookAhead) ||     // Closing brace/bracket
          trimmedLookAhead === '';                   // End of input
        
        if (isEndOfString && !hasContentAfter) {
          // This quote appears to end the string
          inString = false;
          result += char;
        } else {
          // This quote is inside the string content - escape it
          result += '\\"';
        }
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Generate embedding for text using Gemini
 * @param text - Text to embed
 * @returns Embedding vector
 */
export async function embedText(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });

  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Chunk transcript into smaller pieces for RAG
 * @param transcript - Transcript object
 * @param chunkSize - Number of segments per chunk
 * @returns Array of text chunks with metadata
 */
function chunkTranscript(transcript: any, chunkSize: number = 5): Array<{
  text: string;
  videoName: string;
  startTime: number | null;
  endTime: number | null;
  hasTimestamps: boolean;
}> {
  const chunks: Array<{
    text: string;
    videoName: string;
    startTime: number | null;
    endTime: number | null;
    hasTimestamps: boolean;
  }> = [];
  // Support both new format (audio_transcript) and legacy format (segments)
  const segments = transcript.audio_transcript || transcript.segments || [];
  
  // Check if this is text-only content
  // Text-only content typically has:
  // 1. Empty visual_description array
  // 2. All timestamps are 0 or very small (artificial timestamps for text chunks)
  const hasVisualDescription = transcript.visual_description && transcript.visual_description.length > 0;
  const hasMeaningfulTimestamps = segments.length > 0 && segments.some((s: any) => {
    const start = s.start ?? 0;
    const end = s.end ?? 0;
    // Consider timestamps meaningful if they're > 5 seconds (real audio/video would have longer segments)
    return start > 5 || end > 5;
  });
  const hasTimestamps = hasVisualDescription || hasMeaningfulTimestamps;

  // If no segments, try to extract text from the transcript itself (for text-only content)
  if (segments.length === 0 && transcript.text) {
    // For text-only content, chunk by paragraphs or sentences
    const textChunks = transcript.text.split(/\n\n+/).filter((chunk: string) => chunk.trim().length > 0);
    textChunks.forEach((text: string, idx: number) => {
      chunks.push({
        text: text.trim(),
        videoName: transcript.videoName || 'unknown',
        startTime: null,
        endTime: null,
        hasTimestamps: false,
      });
    });
    return chunks;
  }

  for (let i = 0; i < segments.length; i += chunkSize) {
    const chunkSegments = segments.slice(i, i + chunkSize);
    const text = chunkSegments.map((s: any) => s.speech || s.text || '').join(' ').trim();
    if (!text) continue;
    
    const startTime = chunkSegments[0]?.start;
    const endTime = chunkSegments[chunkSegments.length - 1]?.end;

    chunks.push({
      text,
      videoName: transcript.videoName || 'unknown',
      startTime: hasTimestamps ? (startTime ?? null) : null,
      endTime: hasTimestamps ? (endTime ?? null) : null,
      hasTimestamps,
    });
  }

  return chunks;
}

/**
 * Answer a question using RAG over transcripts
 * @param question - User's question
 * @param transcripts - Array of transcript objects
 * @param topK - Number of top chunks to retrieve
 * @param sop - Optional latest SOP to include as context
 * @param media - Optional array of media attachments with base64 data
 * @returns Object containing markdown answer and sources
 */
export async function answerQuestion(
  question: string,
  transcripts: any[],
  topK: number = 5,
  sop?: { markdown: string; notes: string } | null,
  media?: Array<{ type: 'image' | 'video'; filename: string; base64: string; mimeType: string }>
): Promise<{
  markdown: string;
  sources: string[];
}> {
  // Chunk all transcripts
  const allChunks = transcripts.flatMap(t => chunkTranscript(t));

  // Embed question
  const questionEmbedding = await embedText(question);

  // Embed all chunks
  const chunkEmbeddings = await Promise.all(
    allChunks.map(chunk => embedText(chunk.text))
  );

  // Compute similarities
  const similarities = chunkEmbeddings.map((embedding, idx) => ({
    chunk: allChunks[idx],
    similarity: cosineSimilarity(questionEmbedding, embedding),
  }));

  // Sort and get top-k
  similarities.sort((a, b) => b.similarity - a.similarity);
  const topChunks = similarities.slice(0, topK);

  // Format chunks for the model
  const chunksText = topChunks
    .map(
      (item, idx) => {
        if (item.chunk.hasTimestamps && item.chunk.startTime !== null && item.chunk.endTime !== null) {
          return `Chunk ${idx + 1} (from ${item.chunk.videoName}, ${item.chunk.startTime}s-${item.chunk.endTime}s):\n${item.chunk.text}`;
        } else {
          return `Chunk ${idx + 1} (from ${item.chunk.videoName}):\n${item.chunk.text}`;
        }
      }
    )
    .join('\n\n');

  // Read the prompt
  const prompt = await readPrompt('question');

  // Build the content array
  const content: any[] = [
    prompt,
    '\n\nQuestion:\n',
    question,
    '\n\nTranscript Chunks:\n',
    chunksText,
  ];

  // Add media attachments if available
  if (media && media.length > 0) {
    console.log('[AnswerQuestion] Including media attachments:', media.length);
    content.push('\n\n---\n\nUser has attached the following media to help with the question:\n');

    for (const mediaItem of media) {
      try {
        content.push({
          inlineData: {
            data: mediaItem.base64,
            mimeType: mediaItem.mimeType,
          },
        });
        content.push(`\n(${mediaItem.type === 'image' ? 'Image' : 'Video'} attachment: ${mediaItem.filename})\n`);
      } catch (error) {
        console.error('[AnswerQuestion] Failed to process media:', mediaItem.filename, error);
      }
    }
  }

  // Add SOP context if available
  if (sop) {
    console.log('[AnswerQuestion] Including SOP context in prompt');
    content.push(
      '\n\n---\n\nLatest Standard Operating Procedure (SOP):\n',
      sop.markdown,
    );
    if (sop.notes) {
      content.push(
        '\n\nSOP Notes:\n',
        sop.notes,
      );
    }
  }

  // Use plain text model - no JSON enforcement
  const model = getGenAI().getGenerativeModel({ 
    model: getModelName(),
  });

  const result = await model.generateContent(content);

  const response = result.response;
  const text = response.text();

  console.log('[AnswerQuestion] Raw response length:', text.length, 'chars');
  console.log('[AnswerQuestion] Raw response preview (first 500 chars):', text.substring(0, 500));

  // Extract markdown content directly (no JSON parsing needed)
  try {
    let markdown = text.trim();
    
    // Remove markdown code blocks if present
    const codeBlockMatch = markdown.match(/```(?:markdown)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      markdown = codeBlockMatch[1].trim();
    }
    
    // Extract sources section if present
    let sources: string[] = [];
    const sourcesMatch = markdown.match(/##\s+Sources?\s*\n\n([\s\S]*?)(?=\n##|$)/i);
    if (sourcesMatch) {
      const sourcesText = sourcesMatch[1].trim();
      // Parse sources from list format
      sources = sourcesText
        .split('\n')
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0);
      // Remove sources section from markdown
      markdown = markdown.replace(/##\s+Sources?\s*\n\n[\s\S]*?(?=\n##|$)/i, '').trim();
    } else {
      // Fallback: use default sources from top chunks - just show filename, deduplicated
      const uniqueFilenames = Array.from(new Set(topChunks.map((item) => item.chunk.videoName)));
      sources = uniqueFilenames.map((filename) => {
        return `(${filename})`;
      });
    }
    
    console.log('[AnswerQuestion] Extracted markdown, length:', markdown.length, 'chars');
    console.log('[AnswerQuestion] Extracted sources:', sources.length, 'items');
    console.log('[AnswerQuestion] Answer generation completed successfully');

    return {
      markdown: markdown || text.trim(),
      sources: sources,
    };
  } catch (error) {
    console.error('[AnswerQuestion] ERROR: Failed to extract content from response');
    console.error('[AnswerQuestion] Raw response text (full):', text);
    if (error instanceof Error) {
      console.error('[AnswerQuestion] Error message:', error.message);
    }
    
    // Final fallback: return the raw text with default sources - just show filename, deduplicated
    const uniqueFilenames = Array.from(new Set(topChunks.map((item) => item.chunk.videoName)));
    return {
      markdown: text.trim(),
      sources: uniqueFilenames.map((filename) => {
        return `(${filename})`;
      }),
    };
  }
}

