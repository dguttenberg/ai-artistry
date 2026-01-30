# AI Artistry

Creative-to-prompt translation for generative AI video tools.

## Quick Start

### 1. Clone/Download

Get these files into a local folder.

### 2. Create GitHub Repo

```bash
cd ai-artistry
git init
git add .
git commit -m "Initial commit"
gh repo create ai-artistry --private --source=. --push
```

Or create repo manually on GitHub and push.

### 3. Deploy to Vercel

**Option A: Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel
```

**Option B: Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Deploy (it auto-detects the config)

### 4. Add Environment Variable

In Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add: `ANTHROPIC_API_KEY` = your API key
3. Redeploy (or it picks up on next deploy)

### 5. You're Live!

Your app is now at `https://your-project.vercel.app`

---

## Local Development

```bash
# Install dependencies
npm install

# Add API key to environment
export ANTHROPIC_API_KEY=your-key-here

# Run local dev server
npm run dev
```

Opens at `http://localhost:3000`

---

## Project Structure

```
ai-artistry/
├── index.html          # Main app interface
├── reasoning-engine.js # Core translation logic (reference)
├── reasoning-engine.md # Documentation
├── api/
│   └── generate.js     # Vercel serverless function (calls Claude)
├── package.json
├── vercel.json         # Vercel configuration
└── README.md
```

---

## How It Works

1. **User enters creative brief** → Frontend sends to `/api/generate`
2. **API endpoint** → Calls Claude with reasoning engine system prompt
3. **Claude returns** → Structured JSON prompt architecture
4. **Frontend renders** → Shot cards with copy/paste prompts

The "reasoning engine" is the system prompt that instructs Claude how to translate creative intent into technical prompts.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

Get your API key at [console.anthropic.com](https://console.anthropic.com)

---

## Customization

### Change the AI Model

In `api/generate.js`, modify the model:
```javascript
model: 'claude-sonnet-4-20250514',  // or 'claude-opus-4-20250514' for complex briefs
```

### Modify the Reasoning Engine

The system prompt is in `index.html` (embedded) and `reasoning-engine.md` (documentation). Edit to change how Claude interprets creative briefs.

### Add Brand Brain Connection (Future)

The architecture supports injecting brand context. See `reasoning-engine.md` for the integration pattern.
