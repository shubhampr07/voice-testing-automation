# 🤖 AI-Automated Voice Agent Testing Platform

A sophisticated Next.js application that automatically tests and improves debt collection voice agents through AI-powered persona generation, conversation simulation, and self-correction.

## 🎯 What This Does

This platform solves a critical problem: **How do you test a voice agent against hundreds of different customer scenarios without manual testing?**

### The Solution:
1. **Generate** diverse loan defaulter personas with AI
2. **Simulate** realistic conversations (text or voice)
3. **Analyze** performance with custom metrics
4. **Self-correct** the bot script automatically
5. **Iterate** until the bot handles every scenario perfectly

---

## 🌟 Key Features

### 1. **Text-Based Testing** (Home Page)
- Generate multiple personas with different personalities
- Run automated testing cycles
- View conversation transcripts
- Track improvement across iterations
- See detailed metrics and suggestions

### 2. **Voice Testing** (Conversations Page)
- Real-time voice conversations using ElevenLabs TTS
- Live audio playback of bot and customer
- Visual conversation display
- Iteration-by-iteration score tracking
- View improved scripts after each iteration

### 3. **Intelligent Metrics**
- **Negotiation Effectiveness**: How well the bot negotiates payment
- **Response Relevance**: How well the bot stays on topic
- **Overall Score**: Combined performance metric

### 4. **Self-Correction Engine**
- Automatically identifies weak points
- Rewrites bot script to address issues
- Continues until threshold score (85+) or max iterations (5)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- Gemini API key (Google AI)
- ElevenLabs API key (for voice)

### 1. Clone & Install

```bash
cd webapp
npm install
```

### 2. Set Up Database

```bash
# Initialize Prisma
npx prisma generate
npx prisma db push
```

### 3. Configure Environment

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/voice_automation"

# AI APIs
GEMINI_API_KEY="your_gemini_api_key_here"
ELEVENLABS_API_KEY="your_elevenlabs_api_key_here"
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
voice_automation/
├── app/
│   ├── page.tsx                    # Home - Text Testing
│   ├── conversations/page.tsx      # Voice Testing
│   ├── layout.tsx                  # Navigation & Layout
│   └── api/
│       ├── start-testing/          # Text testing endpoint
│       ├── live-conversation/      # Voice testing endpoint
│       ├── sessions/               # Session data API
│       ├── conversations/          # Conversation details API
│       └── tts/                    # Text-to-speech API
├── lib/
│   ├── persona-generator.ts        # AI persona creation
│   ├── conversation-simulator.ts   # Conversation logic
│   ├── metrics-analyzer.ts         # Performance analysis
│   ├── self-correction-engine.ts   # Script improvement
│   ├── testing-platform.ts         # Main orchestrator
│   ├── database-service.ts         # Database operations
│   ├── config.ts                   # Configuration
│   └── types.ts                    # TypeScript types
├── prisma/
│   └── schema.prisma               # Database schema
└── components/
    └── ui/                         # Reusable UI components
```

---

## 🔧 How It Works

### Text Testing Flow

```
1. User clicks "Start Testing"
   ↓
2. Generate N personas (e.g., 3 personas)
   - Aggressive Denier
   - Cooperative but Broke
   - Emotional Pleader
   ↓
3. For each iteration (max 5):
   ↓
   a. Run conversation with each persona
      - Bot uses current script
      - Persona responds in character
      - 10 turns per conversation
   ↓
   b. Analyze all conversations
      - Calculate Negotiation score
      - Calculate Relevance score
      - Generate improvement suggestions
   ↓
   c. Check if threshold reached (85+)
      - YES → Stop, Success! ✓
      - NO → Continue to step d
   ↓
   d. Improve bot script
      - AI analyzes weak points
      - Rewrites script to address issues
      - Use improved script for next iteration
   ↓
4. Repeat until success or max iterations
   ↓
5. Save all data to database
   ↓
6. Display results in UI
```

### Voice Testing Flow

```
1. User selects persona type & voices
   ↓
2. Click "Start Conversation"
   ↓
3. Generate one persona
   ↓
4. For each iteration (max 5):
   ↓
   a. Run voice conversation
      - Bot speaks (ElevenLabs TTS)
      - Customer responds (ElevenLabs TTS)
      - Real-time audio playback
   ↓
   b. Analyze conversation
      - Calculate metrics
      - Generate suggestions
   ↓
   c. Display iteration results
      - Show scores
      - "View Script" button appears
   ↓
   d. Check threshold
      - YES → Stop ✓
      - NO → Improve script & continue
   ↓
5. Save to database
   ↓
6. Show all iteration results below
```

---


## 🎨 User Interface

### Home Page (Text Testing)

**Setup Tab:**
- Number of personas slider
- Persona types selection
- Start Testing button

**Results Tab:**
- Previous test runs list
- Click to expand session details
- Iteration progress cards
- "View Chat" buttons for each conversation
- Full conversation modal with:
  - Turn-by-turn messages
  - Improvement suggestions
  - Metrics breakdown

### Voice Testing Page

**Controls:**
- Persona type dropdown
- Bot voice selector
- Customer voice selector
- Start/Stop buttons

**Live Display:**
- Real-time messages
- Iteration banners
- Audio playback

**Results:**
- Iteration score cards
- "View Script" buttons
- Script improvement modal

---

## 🔑 Key Technologies

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Modern icon library

### Backend
- **Next.js API Routes**: Serverless endpoints
- **Prisma ORM**: Database toolkit
- **PostgreSQL**: Relational database
- **Server-Sent Events**: Real-time streaming

### AI & Voice
- **Google Gemini**: LLM for personas, conversations, analysis
- **ElevenLabs**: High-quality text-to-speech
- **Streaming**: Real-time conversation generation

---

## ⚙️ Configuration

Edit `lib/config.ts` to customize:

```typescript
export const config = {
  // AI Model
  geminiModel: 'gemini-2.0-flash',
  
  // Testing Parameters
  maxIterations: 5,
  minThresholdScore: 85,
  maxConversationTurns: 10,
  
  // Persona Types
  personaTypes: [
    'aggressive_denier',
    'cooperative_but_broke',
    'evasive_avoider',
    // ... more types
  ],
  
  // Voice Settings
  elevenLabsVoices: [
    { id: 'voice_id', name: 'Professional Male' },
    // ... more voices
  ],
  
  // Base Bot Script
  baseBotScript: `Your initial script here...`
};
```

---

## 📈 Metrics Explained

### Negotiation Effectiveness (0-100)
Measures how well the bot:
- Offers payment plans
- Shows empathy
- Handles objections
- Moves toward resolution

### Response Relevance (0-100)
Measures how well the bot:
- Stays on topic
- Addresses customer questions
- Avoids repetition
- Maintains context

### Overall Score (0-100)
Average of all metrics, determines if threshold is reached.

---

## 🎯 Use Cases

### 1. **Initial Bot Development**
- Start with basic script
- Run automated testing
- Let AI improve it to handle edge cases

### 2. **Regression Testing**
- Test script changes against all persona types
- Ensure improvements don't break existing scenarios

### 3. **Performance Benchmarking**
- Compare different script versions
- Track improvement over time

### 4. **Training Data Generation**
- Generate realistic conversation examples
- Use for training human agents

---

## 🐛 Troubleshooting

### "429 Too Many Requests" Error
**Cause**: Gemini API rate limits  
**Solution**: Delays are already added (5 seconds between turns). If still occurring, increase delays in `app/api/live-conversation/route.ts`

### Voice Not Playing
**Cause**: ElevenLabs API key or quota  
**Solution**: Check `.env.local` has valid `ELEVENLABS_API_KEY` and you have quota remaining

### Database Connection Error
**Cause**: PostgreSQL not running or wrong credentials  
**Solution**: 
```bash
# Check PostgreSQL is running
# Update DATABASE_URL in .env.local
npx prisma db push
```

### Scores Decreasing Between Iterations
**Cause**: LLM variability in conversation generation  
**Expected**: Some variation is normal. The system continues improving the script regardless.

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# - DATABASE_URL
# - GEMINI_API_KEY
# - ELEVENLABS_API_KEY
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "start"]
```

---

## 📄 License

MIT License - Feel free to use for your projects!

---

**Built with ❤️ for automated voice agent testing**
