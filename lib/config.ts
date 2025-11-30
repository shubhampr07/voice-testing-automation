/**
 * Configuration for the Voice Agent Testing Platform
 */

export const config = {
  // Gemini API Configuration
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: 'gemini-2.0-flash',

  // ElevenLabs API Configuration
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',

  // ElevenLabs Voice Options
  elevenLabsVoices: [
    {
      id: '21m00Tcm4TlvDq8ikWAM',
      name: 'Rachel',
      description: 'Calm, professional female voice',
      gender: 'female',
    },
    {
      id: 'pNInz6obpgDQGcFmaJgB',
      name: 'Adam',
      description: 'Deep, confident male voice',
      gender: 'male',
    },
    {
      id: 'AZnzlk1XvdvUeBnXmlld',
      name: 'Domi',
      description: 'Strong, assertive female voice',
      gender: 'female',
    },
    {
      id: 'g5CIjZEefAph4nQFvHAz',
      name: 'Ethan',
      description: 'Friendly, conversational male voice',
      gender: 'male',
    },
    {
      id: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Bella',
      description: 'Soft, empathetic female voice',
      gender: 'female',
    },
  ],

  // Testing Configuration
  maxConversationTurns: 6,  // 6 turns each = 12 total messages (faster testing)
  minThresholdScore: 85,
  maxIterations: 5,

  // Metrics Configuration
  metrics: {
    negotiation_effectiveness: {
      weight: 0.5,
      description: 'Measures how well the bot negotiates with the customer - shows empathy, offers solutions, handles objections',
    },
    response_relevance: {
      weight: 0.5,
      description: 'Measures if bot responses are relevant to customer queries and stay on topic',
    },
  },

  // Persona Types
  personaTypes: [
    'aggressive_denier',
    'cooperative_but_broke',
    'evasive_avoider',
    'emotional_pleader',
    'hostile_threatener',
    'confused_elderly',
    'busy_professional',
    'payment_plan_seeker',
  ],

  // Base Debt Collection Bot Script
  baseBotScript: `You are a professional debt collection agent for a financial institution. Your goal is to recover outstanding debt while maintaining professionalism and empathy.

Key Guidelines:
1. Always introduce yourself and the purpose of the call
2. Verify the customer's identity before discussing debt details
3. Listen to customer concerns and show empathy
4. Offer payment plans when appropriate
5. Document promises to pay
6. Never threaten or harass the customer
7. Follow legal compliance guidelines (FDCPA)
8. Be persistent but respectful
9. Aim to secure a commitment for payment

Debt Details:
- Outstanding Amount: $2,500
- Days Past Due: 45 days
- Original Creditor: First National Bank
- Account Number: XXXX-1234

Your objective is to:
1. Confirm the debt
2. Understand the customer's situation
3. Negotiate a payment arrangement
4. Secure a commitment date`,
};

export default config;
