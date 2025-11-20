# Local Development (Without Vercel)

Get your development environment running in **3 simple steps** - no Vercel account needed!

The app will automatically use local file storage for transcripts. When you're ready to deploy to Vercel later, it will seamlessly switch to Vercel KV.

---

## Prerequisites

- Node.js 18+ installed
- A Google Gemini API key ([Get one free here](https://aistudio.google.com/app/apikey))

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Configure Environment

Create your environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

That's it! You don't need Vercel KV for local development.

---

## Step 3: Add Test Videos

Create a task folder and add a test video:

```bash
# Create task folder
mkdir -p tasks/my-first-task/videos

# Copy your .mp4 video (replace with your actual path)
# Example:
# cp ~/Downloads/demo.mp4 tasks/my-first-task/videos/
```

**You need at least one .mp4 video to test!**

---

## Step 4: Start Development Server

```bash
npm run dev
```

You should see:

```
▲ Next.js 14.2.33
- Local:        http://localhost:3000

🔧 Using local mock KV storage (.kv-storage/)
✓ Ready in 2.1s
```

The message "Using local mock KV storage" means it's working correctly!

Open **http://localhost:3000** in your browser.

---

## Test the Application

### 1. Upload & Transcribe
1. Click **"Upload"** in the sidebar
2. Select **"my-first-task"** from dropdown
3. Click **"Transcribe"** on your video
4. Wait 30s-3min for transcription to complete
5. Status changes to "✅ Transcribed"

### 2. Generate Knowledge (SOP)
1. Click **"Knowledge"** in sidebar
2. Select **"my-first-task"**
3. Click **"Generate SOP"**
4. View the consolidated procedure

### 3. Ask Questions
1. Click **"Questions"** in sidebar
2. Select **"my-first-task"**
3. Type a question about your video
4. Click **"Ask"**
5. Get an AI-powered answer

---

## How It Works Locally

### Storage

**Local Development:**
- Transcripts are saved to `.kv-storage/` folder (gitignored)
- Works exactly like Vercel KV, but on your filesystem
- No Vercel account needed

**Production (Vercel):**
- Automatically detects Vercel environment
- Switches to real Vercel KV storage
- Same code, zero changes needed!

### Files Created Locally

```
.kv-storage/
  tasks__SLASH__my-first-task__SLASH__video.mp4.json
  tasks__SLASH__my-first-task__SLASH__another.mp4.json
```

These are your transcripts stored locally. They're automatically gitignored.

---

## Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Test production build
npm start            # Run production build locally

# Clean up
rm -rf .kv-storage   # Delete all local transcripts
rm -rf .next         # Clean build cache
```

---

## Adding More Tasks

```bash
# Create a new task
mkdir -p tasks/another-task/videos

# Add videos
cp ~/Videos/*.mp4 tasks/another-task/videos/

# Restart dev server (or just refresh the page)
```

The new task will automatically appear in dropdowns!

---

## Customization

### Modify AI Prompts

Edit files in `/prompts/`:

```bash
# Change transcription behavior
nano prompts/transcribe.txt

# Change SOP generation
nano prompts/summarize.txt

# Change Q&A behavior
nano prompts/question.txt
```

Restart the dev server after changes.

### Modify UI

All pages are in `/app/`:
- Home page: `app/page.tsx`
- Upload page: `app/upload/page.tsx`
- Procedure page: `app/procedure/page.tsx`
- Questions page: `app/questions/page.tsx`

Changes are hot-reloaded automatically!

---

## Troubleshooting

### "GEMINI_API_KEY is not set"

Make sure you created `.env` file:
```bash
cat .env | grep GEMINI
```

Should show: `GEMINI_API_KEY=AIza...`

### "No tasks found"

Create a task folder:
```bash
mkdir -p tasks/test-task/videos
# Add .mp4 files
```

### Videos not showing

1. Make sure files are `.mp4` format
2. Check they're in the right location:
   ```bash
   ls tasks/*/videos/
   ```
3. Restart dev server

### Transcription fails

1. Check your Gemini API key is valid
2. Check you have API quota (free tier limits)
3. Try a shorter video first (< 1 minute)
4. Check browser console for errors (F12)

### Build fails

```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

---

## Deploy to Vercel (When Ready)

When you're ready to deploy to production:

1. **Push to Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Add Vercel KV database
   - Add `GEMINI_API_KEY` environment variable
   - Deploy!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**The same code works for both local and production!** No changes needed.

---

## Project Structure

```
tribal-knowledge/
├── .env                    # Your local config (gitignored)
├── .kv-storage/            # Local transcript storage (gitignored)
├── tasks/                  # Your task folders
│   └── my-task/
│       └── videos/         # Your .mp4 files
├── prompts/                # AI prompts (customize these!)
├── app/                    # Pages and components
├── lib/                    # Core logic
│   ├── gemini.ts          # AI integration
│   ├── storage.ts         # Storage (auto-detects local/Vercel)
│   └── mock-kv.ts         # Local KV implementation
└── package.json
```

---

## What's Next?

1. ✅ Add more videos and tasks
2. ✅ Customize the AI prompts
3. ✅ Modify the UI to your liking
4. ✅ Deploy to Vercel when ready

---

## Need Help?

- **Quick reference**: See [QUICK_START.md](./QUICK_START.md)
- **Full documentation**: See [README.md](./README.md)
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**You're all set! Start transcribing videos! 🚀**
