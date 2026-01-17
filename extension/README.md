# Prompt Gallery Browser Extension

A Chrome extension that allows you to save AI prompts from Reddit, X/Twitter, or any webpage directly to your Prompt Gallery.

## Features

- **Context Menu**: Right-click on any selected text to save it as a prompt
- **Reddit Integration**: Automatically detect AI art posts on r/midjourney, r/StableDiffusion, etc.
- **X/Twitter Integration**: Capture prompts from AI art tweets
- **Smart Parsing**: Automatically extract Midjourney parameters (--ar, --v) and Stable Diffusion parameters (Steps, CFG, Seed)
- **Image Extraction**: Save images along with prompts from social media posts

## Development Setup

1. **Install dependencies**:
   ```bash
   cd extension
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

## Building for Production

```bash
npm run build
```

The built extension will be in `extension/dist`. You can zip this folder for Chrome Web Store submission.

## Supported Sites

### Reddit
- r/midjourney
- r/StableDiffusion
- r/aiArt
- r/dalle
- r/comfyui
- r/FluxAI
- r/Leonardo_AI
- r/Kling_AI

### X/Twitter
- Tweets with AI art hashtags (#midjourney, #aiart, #stablediffusion, etc.)
- Tweets with prompt parameters (--ar, --v, prompt:, etc.)

## How to Use

### Method 1: Context Menu
1. Select any text on a webpage
2. Right-click and choose "Save to Prompt Gallery"
3. Edit the prompt details in the popup
4. Click "Save Prompt"

### Method 2: Floating Button (Reddit/X)
1. Visit a post on a supported subreddit or AI art tweet
2. Click the floating "Save Prompt" button
3. Review the extracted prompt and images
4. Click "Save Prompt"

## Project Structure

```
extension/
├── manifest.json          # Extension manifest (V3)
├── src/
│   ├── background/        # Service worker
│   ├── content/           # Content scripts (Reddit, Twitter)
│   ├── popup/             # React popup UI
│   ├── lib/               # Shared utilities
│   └── types/             # TypeScript types
├── public/
│   └── icons/             # Extension icons
└── vite.config.ts         # Build configuration
```

## API Endpoints Used

The extension communicates with the main Prompt Gallery app via these endpoints:

- `POST /api/extension/auth` - User authentication
- `GET /api/extension/auth` - Check auth status
- `POST /api/extension/prompts` - Create a new prompt
- `GET /api/extension/prompts` - Get user's recent prompts
- `POST /api/extension/upload-external` - Process external images

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Vite + @crxjs/vite-plugin
- Chrome Extension Manifest V3
