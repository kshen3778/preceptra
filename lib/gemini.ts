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
  
  // Use responseMimeType to force JSON output (available in gemini-1.5-pro and newer)
  const model = getGenAI().getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
    },
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

  // Parse JSON response
  try {
    console.log('[Summarize] Attempting to parse JSON response...');
    
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text.trim();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      console.log('[Summarize] Found JSON in code block, extracting...');
      jsonText = jsonMatch[1].trim();
    } else {
      console.log('[Summarize] No code blocks found, using raw text');
    }
    
    // Find the JSON object by looking for balanced braces
    // Start from the first { and find the matching }
    let jsonStart = jsonText.indexOf('{');
    if (jsonStart === -1) {
      throw new Error('No JSON object found in response');
    }

    // Find the matching closing brace by counting braces
    // This properly handles strings with quotes inside
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
      // JSON might be incomplete, try to extract what we have
      console.warn('[Summarize] JSON appears incomplete, attempting to extract partial JSON');
      // Try to find where the JSON might have been cut off and attempt to close it
      jsonText = jsonText.substring(jsonStart);
      // Try to close unclosed strings and objects
      if (!jsonText.endsWith('}')) {
        // Count unclosed braces
        const openBraces = (jsonText.match(/\{/g) || []).length;
        const closeBraces = (jsonText.match(/\}/g) || []).length;
        const missingBraces = openBraces - closeBraces;
        
        // Try to fix incomplete strings
        let fixedText = jsonText;
        // If we're in the middle of a string, try to close it
        const lastQuote = fixedText.lastIndexOf('"');
        const lastOpenBrace = fixedText.lastIndexOf('{');
        if (lastQuote > lastOpenBrace) {
          // Check if we're in a string by counting quotes before and after
          const quotesBefore = (fixedText.substring(0, lastQuote).match(/"/g) || []).length;
          if (quotesBefore % 2 === 1) {
            // We're in a string, try to close it
            const beforeLastQuote = fixedText.substring(0, lastQuote + 1);
            fixedText = beforeLastQuote;
          }
        }
        
        // Close any unclosed braces
        for (let i = 0; i < missingBraces; i++) {
          fixedText += '}';
        }
        
        // Try to close arrays if needed
        const openArrays = (fixedText.match(/\[/g) || []).length;
        const closeArrays = (fixedText.match(/\]/g) || []).length;
        for (let i = 0; i < openArrays - closeArrays; i++) {
          fixedText += ']';
        }
        
        jsonText = fixedText;
      }
    } else {
      jsonText = jsonText.substring(jsonStart, jsonEnd);
    }

    console.log('[Summarize] Extracted JSON text (first 300 chars):', jsonText.substring(0, 300));
    if (jsonText.length > 300) {
      console.log('[Summarize] Extracted JSON text (last 300 chars):', jsonText.substring(Math.max(0, jsonText.length - 300)));
    }

    // Try to fix common JSON issues like unescaped quotes
    let fixedJsonText = jsonText;
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (firstError) {
      console.warn('[Summarize] Initial JSON.parse failed, attempting to fix JSON issues...');
      try {
        fixedJsonText = fixJSONString(jsonText);
        console.log('[Summarize] Fixed JSON, attempting parse again...');
        parsed = JSON.parse(fixedJsonText);
        console.log('[Summarize] Successfully parsed after fixing JSON issues');
      } catch (secondError) {
        // If fixing didn't work, throw the original error with more context
        throw firstError;
      }
    }
    console.log('[Summarize] JSON parsed successfully');
    console.log('[Summarize] Parsed object keys:', Object.keys(parsed));

    if (!parsed.markdown) {
      console.error('[Summarize] ERROR: Response missing markdown field');
      console.error('[Summarize] Parsed object:', JSON.stringify(parsed, null, 2));
      throw new Error('Response missing markdown field');
    }

    console.log('[Summarize] Markdown field found, length:', parsed.markdown.length, 'chars');
    console.log('[Summarize] Notes field:', parsed.notes ? `present (${parsed.notes.length} chars)` : 'missing');
    console.log('[Summarize] SOP generation completed successfully');

    return {
      markdown: parsed.markdown,
      notes: parsed.notes || '',
    };
  } catch (error) {
    console.error('[Summarize] ERROR: Failed to parse Gemini response as JSON');
    console.error('[Summarize] Raw response text (full):', text);
    console.error('[Summarize] Response length:', text.length);
    console.error('[Summarize] First 1000 chars:', text.substring(0, 1000));
    if (text.length > 1000) {
      console.error('[Summarize] Last 1000 chars:', text.substring(Math.max(0, text.length - 1000)));
    }
    if (error instanceof Error) {
      console.error('[Summarize] Parse error message:', error.message);
      console.error('[Summarize] Parse error stack:', error.stack);
      // Try to find the problematic position
      const errorMatch = error.message.match(/position (\d+)/);
      if (errorMatch) {
        const pos = parseInt(errorMatch[1]);
        console.error('[Summarize] Error at position:', pos);
        console.error('[Summarize] Context around error (100 chars before and after):', 
          text.substring(Math.max(0, pos - 100), Math.min(text.length, pos + 100)));
      }
    }
    
    // Fallback: Try to extract content from plain text/markdown if JSON parsing fails
    console.log('[Summarize] Attempting fallback: extracting content from plain text...');
    try {
      // Look for markdown content that might be the SOP
      const extractedMarkdown = text.trim();
      if (extractedMarkdown.length > 50 && (extractedMarkdown.includes('#') || extractedMarkdown.includes('##'))) {
        console.log('[Summarize] Extracted markdown from fallback, length:', extractedMarkdown.length);
        return {
          markdown: extractedMarkdown,
          notes: 'Note: Response was not in JSON format, content extracted from plain text.',
        };
      }
    } catch (fallbackError) {
      console.error('[Summarize] Fallback extraction also failed:', fallbackError);
    }
    
    throw new Error(`Gemini did not return valid JSON with markdown field. Response preview: ${text.substring(0, 200)}...`);
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
  startTime: number;
  endTime: number;
}> {
  const chunks = [];
  // Support both new format (audio_transcript) and legacy format (segments)
  const segments = transcript.audio_transcript || transcript.segments || [];

  for (let i = 0; i < segments.length; i += chunkSize) {
    const chunkSegments = segments.slice(i, i + chunkSize);
    const text = chunkSegments.map((s: any) => s.speech).join(' ');
    const startTime = chunkSegments[0]?.start || 0;
    const endTime = chunkSegments[chunkSegments.length - 1]?.end || 0;

    chunks.push({
      text,
      videoName: transcript.videoName || 'unknown',
      startTime,
      endTime,
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
      (item, idx) =>
        `Chunk ${idx + 1} (from ${item.chunk.videoName}, ${item.chunk.startTime}s-${item.chunk.endTime}s):\n${item.chunk.text}`
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

  // Use responseMimeType to force JSON output (available in gemini-1.5-pro and newer)
  const model = getGenAI().getGenerativeModel({ 
    model: getModelName(),
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(content);

  const response = result.response;
  const text = response.text();

  console.log('[AnswerQuestion] Raw response length:', text.length, 'chars');
  console.log('[AnswerQuestion] Raw response preview (first 500 chars):', text.substring(0, 500));

  // Parse JSON response
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text.trim();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      console.log('[AnswerQuestion] Found JSON in code block, extracting...');
      jsonText = jsonMatch[1].trim();
    }
    
    // Find the JSON object by looking for balanced braces
    // Start from the first { and find the matching }
    let jsonStart = jsonText.indexOf('{');
    if (jsonStart === -1) {
      throw new Error('No JSON object found in response');
    }

    // Find the matching closing brace by counting braces
    let braceCount = 0;
    let jsonEnd = -1;
    let inString = false;
    let escapeNext = false;

    console.log('[AnswerQuestion] Starting brace matching from position:', jsonStart);
    console.log('[AnswerQuestion] Text length:', jsonText.length);

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
            console.log('[AnswerQuestion] Found matching closing brace at position:', jsonEnd);
            break;
          }
        }
      }
    }

    console.log('[AnswerQuestion] Brace matching complete. jsonEnd:', jsonEnd, 'braceCount:', braceCount);

    if (jsonEnd === -1) {
      // JSON might be incomplete, try to extract what we have
      console.warn('[AnswerQuestion] JSON appears incomplete, attempting to extract partial JSON');
      // Try to find where the JSON might have been cut off and attempt to close it
      jsonText = jsonText.substring(jsonStart);
      // Try to close unclosed strings and objects
      if (!jsonText.endsWith('}')) {
        // Count unclosed braces
        const openBraces = (jsonText.match(/\{/g) || []).length;
        const closeBraces = (jsonText.match(/\}/g) || []).length;
        const missingBraces = openBraces - closeBraces;
        
        // Try to fix incomplete strings
        let fixedText = jsonText;
        // If we're in the middle of a string, try to close it
        const lastQuote = fixedText.lastIndexOf('"');
        const lastOpenBrace = fixedText.lastIndexOf('{');
        if (lastQuote > lastOpenBrace && !fixedText.substring(lastQuote + 1).match(/^[^"]*$/)) {
          // Might be in a string, try to close it
          const beforeLastQuote = fixedText.substring(0, lastQuote + 1);
          const afterLastQuote = fixedText.substring(lastQuote + 1);
          // Remove incomplete content after last quote
          fixedText = beforeLastQuote;
        }
        
        // Close any unclosed braces
        for (let i = 0; i < missingBraces; i++) {
          fixedText += '}';
        }
        
        // Try to close arrays if needed
        const openArrays = (fixedText.match(/\[/g) || []).length;
        const closeArrays = (fixedText.match(/\]/g) || []).length;
        for (let i = 0; i < openArrays - closeArrays; i++) {
          fixedText += ']';
        }
        
        jsonText = fixedText;
      }
    } else {
      jsonText = jsonText.substring(jsonStart, jsonEnd);
    }

    console.log('[AnswerQuestion] Extracted JSON text (first 300 chars):', jsonText.substring(0, 300));
    if (jsonText.length > 300) {
      console.log('[AnswerQuestion] Extracted JSON text (last 300 chars):', jsonText.substring(Math.max(0, jsonText.length - 300)));
    }
    console.log('[AnswerQuestion] Extracted JSON length:', jsonText.length, 'chars');
    console.log('[AnswerQuestion] JSON starts with:', jsonText.substring(0, 50));
    console.log('[AnswerQuestion] JSON ends with:', jsonText.substring(Math.max(0, jsonText.length - 50)));

    // Try to fix common JSON issues like unescaped quotes
    let fixedJsonText = jsonText;
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (firstError) {
      console.warn('[AnswerQuestion] Initial JSON.parse failed, attempting to fix JSON issues...');
      if (firstError instanceof Error) {
        console.error('[AnswerQuestion] Initial parse error:', firstError.message);
        // Try to find the error position
        const errorMatch = firstError.message.match(/position (\d+)/);
        if (errorMatch) {
          const pos = parseInt(errorMatch[1]);
          console.error('[AnswerQuestion] Error at position:', pos);
          console.error('[AnswerQuestion] Context around error (200 chars before and after):', 
            jsonText.substring(Math.max(0, pos - 200), Math.min(jsonText.length, pos + 200)));
        }
      }
      try {
        fixedJsonText = fixJSONString(jsonText);
        console.log('[AnswerQuestion] Fixed JSON, attempting parse again...');
        parsed = JSON.parse(fixedJsonText);
        console.log('[AnswerQuestion] Successfully parsed after fixing JSON issues');
      } catch (secondError) {
        // If fixing didn't work, throw the original error with more context
        console.error('[AnswerQuestion] Fixing JSON also failed');
        if (secondError instanceof Error) {
          console.error('[AnswerQuestion] Second parse error:', secondError.message);
        }
        throw firstError;
      }
    }

    if (!parsed.markdown) {
      console.error('[AnswerQuestion] ERROR: Response missing markdown field');
      console.error('[AnswerQuestion] Parsed object keys:', Object.keys(parsed));
      console.error('[AnswerQuestion] Parsed object:', JSON.stringify(parsed, null, 2));
      throw new Error('Response missing markdown field');
    }

    console.log('[AnswerQuestion] JSON parsed successfully');
    console.log('[AnswerQuestion] Markdown field length:', parsed.markdown.length, 'chars');
    console.log('[AnswerQuestion] Sources:', parsed.sources?.length || 0, 'items');

    return {
      markdown: parsed.markdown,
      sources: parsed.sources || topChunks.map((item, idx) => `Chunk ${idx + 1} (from ${item.chunk.videoName}, ${item.chunk.startTime}s-${item.chunk.endTime}s)`),
    };
  } catch (error) {
    console.error('[AnswerQuestion] ERROR: Failed to parse Gemini response as JSON');
    console.error('[AnswerQuestion] Raw response text (full):', text);
    console.error('[AnswerQuestion] Response length:', text.length);
    console.error('[AnswerQuestion] First 1000 chars:', text.substring(0, 1000));
    if (text.length > 1000) {
      console.error('[AnswerQuestion] Last 1000 chars:', text.substring(Math.max(0, text.length - 1000)));
    }
    if (error instanceof Error) {
      console.error('[AnswerQuestion] Parse error message:', error.message);
      console.error('[AnswerQuestion] Parse error stack:', error.stack);
    }
    
    // Fallback: Try to extract content from plain text/markdown if JSON parsing fails
    console.log('[AnswerQuestion] Attempting fallback: extracting content from plain text...');
    try {
      // Look for markdown content that might be the answer
      const extractedMarkdown = text.trim();
      if (extractedMarkdown.length > 50) {
        console.log('[AnswerQuestion] Extracted markdown from fallback, length:', extractedMarkdown.length);
        return {
          markdown: extractedMarkdown,
          sources: ['Response extracted from plain text format'],
        };
      }
    } catch (fallbackError) {
      console.error('[AnswerQuestion] Fallback extraction also failed:', fallbackError);
    }
    
    throw new Error(`Gemini did not return valid JSON with markdown field. Response preview: ${text.substring(0, 200)}...`);
  }
}

