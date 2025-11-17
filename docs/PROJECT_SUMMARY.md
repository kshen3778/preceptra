# Tribal Knowledge - Project Summary

## Overview

A production-ready Next.js 14 application that transforms expert video demonstrations into actionable knowledge through AI-powered transcription, SOP consolidation, and RAG-driven question answering.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS + shadcn/ui |
| AI Model | Google Gemini (gemini-1.5-flash, text-embedding-004) |
| Storage | Vercel KV (Key-Value Store) |
| Deployment | Vercel (Serverless) |
| Package Manager | npm |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App Router                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Pages:                  API Routes:                    │
│  ├── / (Home)           ├── /api/transcribe-video      │
│  ├── /upload            ├── /api/summarize             │
│  ├── /knowledge         ├── /api/rag                   │
│  └── /questions         ├── /api/tasks                 │
│                         └── /api/videos                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                   Core Libraries                        │
│  ├── lib/gemini.ts   (AI integration)                  │
│  ├── lib/storage.ts  (Vercel KV operations)            │
│  └── lib/utils.ts    (Utilities)                       │
├─────────────────────────────────────────────────────────┤
│                  External Services                      │
│  ├── Google Gemini API (Transcription, Summarization)  │
│  └── Vercel KV (Transcript storage)                    │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Video Transcription
- Upload .mp4 videos organized by task
- Gemini 1.5 Flash processes video/audio
- Generates timestamped transcripts with segments
- Stores results in Vercel KV (read-only FS compatible)

### 2. SOP Generation
- Consolidates multiple transcripts
- Identifies common patterns across experts
- Notes tribal knowledge variations
- Outputs structured Markdown SOP

### 3. RAG Question Answering
- Chunks transcripts into semantic segments
- Generates embeddings using Gemini text-embedding-004
- Retrieves top-k relevant chunks via cosine similarity
- Answers questions with cited sources

## Project Structure

```
tribal-knowledge/
├── app/
│   ├── api/
│   │   ├── transcribe-video/route.ts    # Video → Transcript
│   │   ├── summarize/route.ts           # Transcripts → SOP
│   │   ├── rag/route.ts                 # Question → Answer
│   │   ├── tasks/route.ts               # List tasks
│   │   └── videos/route.ts              # List videos
│   ├── components/
│   │   ├── Sidebar.tsx                  # Navigation
│   │   └── ui/                          # shadcn/ui components
│   ├── upload/page.tsx                  # Upload interface
│   ├── knowledge/page.tsx               # SOP generation
│   ├── questions/page.tsx               # Q&A interface
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Home page
│   └── globals.css                      # Global styles
├── lib/
│   ├── gemini.ts                        # Gemini SDK wrapper
│   ├── storage.ts                       # Vercel KV wrapper
│   └── utils.ts                         # Utility functions
├── prompts/
│   ├── transcribe.txt                   # Transcription prompt
│   ├── summarize.txt                    # SOP generation prompt
│   └── question.txt                     # Q&A prompt
├── tasks/
│   └── example-task/
│       └── videos/                      # .mp4 files go here
├── public/                              # Static assets
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript config
├── tailwind.config.ts                   # Tailwind config
├── next.config.mjs                      # Next.js config
├── vercel.json                          # Vercel config
├── .env.example                         # Environment template
├── README.md                            # User documentation
├── DEPLOYMENT.md                        # Deployment guide
└── PROJECT_SUMMARY.md                   # This file
```

## Data Flow

### Transcription Flow
```
User → Upload Page → /api/transcribe-video
  ↓
Read video from /tasks/<task>/videos/<file>.mp4
  ↓
Send to Gemini (video + transcribe.txt prompt)
  ↓
Parse JSON response (text + segments)
  ↓
Save to Vercel KV: tasks/<task>/<file>.json
  ↓
Return success to UI
```

### SOP Generation Flow
```
User → Knowledge Page → /api/summarize
  ↓
Load all transcripts from Vercel KV
  ↓
Send to Gemini (transcripts + summarize.txt prompt)
  ↓
Parse JSON response (markdown + notes)
  ↓
Render Markdown in UI
```

### RAG Q&A Flow
```
User → Questions Page → /api/rag
  ↓
Load transcripts from Vercel KV
  ↓
Chunk transcripts into segments
  ↓
Embed question + all chunks (Gemini embeddings)
  ↓
Compute cosine similarity
  ↓
Select top-k chunks
  ↓
Send to Gemini (question + chunks + question.txt prompt)
  ↓
Parse JSON response (markdown + sources)
  ↓
Render Markdown in UI
```

## Environment Variables

### Required
- `GEMINI_API_KEY` - Google Gemini API key

### Auto-configured by Vercel
- `KV_URL` - Vercel KV connection URL
- `KV_REST_API_URL` - KV REST API endpoint
- `KV_REST_API_TOKEN` - KV authentication token
- `KV_REST_API_READ_ONLY_TOKEN` - Read-only token

## Vercel Deployment Considerations

### Why Vercel-Compatible?

1. **Read-only Filesystem**
   - Transcripts stored in Vercel KV, not disk
   - Videos read from committed repository files
   - Prompts are static files (read-only OK)

2. **Serverless Functions**
   - All API routes are stateless
   - No long-running processes
   - Cold start optimized with lazy initialization

3. **No Native Binaries**
   - Gemini API handles video processing
   - No ffmpeg or other dependencies
   - Pure TypeScript/JavaScript

4. **Edge-Compatible Code**
   - Can be upgraded to Edge Runtime
   - Uses Web APIs where possible
   - Minimal Node.js-specific code

### Vercel Configuration

**vercel.json**:
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 300  // 5 minutes for video processing
    }
  }
}
```

## Performance Characteristics

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| List tasks | < 100ms | Filesystem read |
| List videos | < 100ms | Filesystem read |
| Transcribe video | 30-180s | Depends on video length |
| Generate SOP | 10-30s | Depends on transcript count |
| Answer question | 5-15s | Includes embedding + generation |

## Scalability

### Current Limits
- Vercel Free: 100 GB bandwidth/month
- Vercel KV Free: 30 MB storage, 3000 commands/day
- Gemini API: Rate limits per tier

### Scaling Strategies
1. Upgrade Vercel plan for higher limits
2. Implement caching for embeddings
3. Use Vercel Blob for large video storage
4. Add rate limiting to prevent abuse
5. Implement background job queue for long operations

## Security

### Implemented
- Environment variable protection
- API key server-side only
- No client-side secrets
- HTTPS by default (Vercel)

### Recommended
- Add authentication (NextAuth.js)
- Implement rate limiting
- Add input validation/sanitization
- Enable CORS restrictions
- Regular dependency updates

## Testing Checklist

### Local Development
- [ ] `npm install` completes
- [ ] `npm run dev` starts server
- [ ] Tasks appear in dropdown
- [ ] Videos load for selected task
- [ ] Transcription works (requires API key)
- [ ] SOP generation works
- [ ] Q&A works

### Production Deployment
- [ ] Build succeeds: `npm run build`
- [ ] Vercel KV connected
- [ ] Environment variables set
- [ ] All pages load
- [ ] Navigation works
- [ ] API routes respond correctly

## Known Limitations

1. **Video Size**: Large videos may timeout (5min limit)
2. **Concurrent Transcriptions**: One at a time recommended
3. **Storage**: Vercel KV free tier limits
4. **Gemini Quotas**: Subject to API rate limits
5. **Client-side File Upload**: Not implemented (videos must be in repo)

## Future Enhancements

### Short Term
- [ ] Add file upload for videos (Vercel Blob)
- [ ] Implement progress indicators
- [ ] Add transcript editing capability
- [ ] Export SOPs as PDF
- [ ] Add authentication

### Medium Term
- [ ] Background job processing
- [ ] Webhook notifications
- [ ] Multi-user support
- [ ] Transcript search
- [ ] Video player with transcript sync

### Long Term
- [ ] Custom embedding models
- [ ] Advanced RAG with reranking
- [ ] Multi-language support
- [ ] Integration with LMS platforms
- [ ] Analytics dashboard

## Dependencies

### Production
```json
{
  "@google/generative-ai": "^0.21.0",  // Gemini SDK
  "@vercel/kv": "^3.0.0",              // KV storage
  "next": "^14.2.0",                    // Framework
  "react": "^18.3.0",                   // UI library
  "react-markdown": "^9.0.1",           // Markdown rendering
  "tailwindcss-animate": "^1.0.7",      // Animations
  "class-variance-authority": "^0.7.1", // Component variants
  "clsx": "^2.1.1",                     // Class merging
  "lucide-react": "^0.553.0",           // Icons
  "tailwind-merge": "^3.4.0"            // Tailwind utils
}
```

### Development
```json
{
  "typescript": "^5",
  "@types/node": "^20",
  "@types/react": "^18",
  "tailwindcss": "^3.4.1",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.49",
  "eslint": "^8",
  "eslint-config-next": "^14.2.0"
}
```

## API Documentation

### POST /api/transcribe-video
**Request**:
```json
{
  "taskName": "string",
  "videoName": "string"
}
```

**Response**:
```json
{
  "success": true,
  "transcript": {
    "text": "string",
    "segments": [
      {
        "start": 0,
        "end": 10,
        "speech": "string"
      }
    ]
  }
}
```

### POST /api/summarize
**Request**:
```json
{
  "taskName": "string"
}
```

**Response**:
```json
{
  "success": true,
  "markdown": "string",
  "notes": "string"
}
```

### POST /api/rag
**Request**:
```json
{
  "taskName": "string",
  "question": "string"
}
```

**Response**:
```json
{
  "success": true,
  "markdown": "string",
  "sources": ["string"]
}
```

### GET /api/tasks
**Response**:
```json
{
  "tasks": ["string"]
}
```

### GET /api/videos?taskName=<name>
**Response**:
```json
{
  "videos": [
    {
      "name": "string",
      "transcribed": boolean
    }
  ]
}
```

## Customization Guide

### Change AI Model
Edit `lib/gemini.ts` and update model names:
```typescript
// For transcription
const model = getGenAI().getGenerativeModel({
  model: 'gemini-1.5-pro'  // or other models
});
```

### Modify Prompts
Edit files in `/prompts/`:
- Ensure JSON output format is maintained
- Test changes locally before deploying
- Prompts must instruct Gemini to return valid JSON

### Adjust RAG Parameters
In `lib/gemini.ts`, modify:
```typescript
// Chunk size (segments per chunk)
function chunkTranscript(transcript: any, chunkSize: number = 5)

// Top-k retrieval
export async function answerQuestion(
  question: string,
  transcripts: any[],
  topK: number = 5  // Increase for more context
)
```

### Custom Styling
- Edit `app/globals.css` for theme colors
- Modify `tailwind.config.ts` for custom tokens
- Update shadcn/ui components in `app/components/ui/`

## Maintenance

### Regular Tasks
- Update dependencies: `npm update`
- Check Gemini API usage
- Monitor Vercel KV storage
- Review error logs
- Rotate API keys (quarterly)

### Backup Strategy
- Git repository contains all code and prompts
- Vercel KV can be exported via CLI
- Download transcripts periodically:
  ```bash
  vercel kv export
  ```

## Support & Resources

- **Documentation**: See README.md and DEPLOYMENT.md
- **Issues**: Report bugs via GitHub Issues
- **Next.js**: https://nextjs.org/docs
- **Vercel**: https://vercel.com/docs
- **Gemini**: https://ai.google.dev/docs

---

**Project Status**: ✅ Production Ready

**Last Updated**: 2025-11-13

**Version**: 1.0.0
