/**
 * Conversation Simulator: Simulates conversations between bot and personas
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona, ConversationTurn } from './types';
import { config } from './config';

export class ConversationSimulator {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private botScript: string;

  constructor(apiKey: string, botScript: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.geminiModel });
    this.botScript = botScript;
  }

  async simulateConversation(persona: Persona): Promise<ConversationTurn[]> {
    const conversation: ConversationTurn[] = [];
    let conversationHistory = '';

    console.log(`\nStarting conversation with ${persona.name} (${persona.persona_type})`);

    for (let turn = 0; turn < config.maxConversationTurns; turn++) {
      // Bot's turn
      let botMessage: string;
      if (turn === 0) {
        botMessage = await this.getBotOpening();
      } else {
        botMessage = await this.getBotResponse(conversationHistory, persona);
      }

      conversation.push({
        turn: turn + 1,
        speaker: 'bot',
        message: botMessage,
        timestamp: new Date(),
      });

      conversationHistory += `\nBot: ${botMessage}`;
      console.log(`🤖 Bot: ${botMessage}`);

      // Check if conversation should end
      if (this.shouldEndConversation(botMessage, conversationHistory)) {
        console.log('Conversation ended by bot.');
        break;
      }

      // Customer's turn
      const customerMessage = await this.getCustomerResponse(conversationHistory, persona);

      conversation.push({
        turn: turn + 1,
        speaker: 'customer',
        message: customerMessage,
        timestamp: new Date(),
      });

      conversationHistory += `\nCustomer: ${customerMessage}`;
      console.log(`👤 Customer: ${customerMessage}`);

      // Check if customer ends conversation
      if (this.shouldEndConversation(customerMessage, conversationHistory)) {
        console.log('Conversation ended by customer.');
        break;
      }
    }

    console.log(`Conversation completed: ${conversation.length} turns\n`);
    return conversation;
  }

  private async getBotOpening(): Promise<string> {
    const prompt = `
You are a debt collection bot. This is the start of a call.

Your script:
${this.botScript}

Generate the opening message for the call. Be professional and follow the script.
Keep it concise (2-3 sentences max).
Return ONLY the message, no additional formatting.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating bot opening:', error);
      return 'Hello, this is calling from the collections department regarding your account. May I speak with the account holder?';
    }
  }

  private async getBotResponse(conversationHistory: string, persona: Persona): Promise<string> {
    const prompt = `
You are a debt collection bot following this script:

${this.botScript}

Conversation so far:
${conversationHistory}

Customer persona traits:
- Communication style: ${persona.communication_style}
- Attitude: ${persona.attitude_towards_debt}

Generate your next response as the bot. Be professional, empathetic, and follow your script.
Address the customer's last message appropriately.
Keep it concise (2-3 sentences max).
Return ONLY the message, no additional formatting.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating bot response:', error);
      return 'I understand your situation. Can we work together to find a solution?';
    }
  }

  private async getCustomerResponse(conversationHistory: string, persona: Persona): Promise<string> {
    const prompt = `
You are roleplaying as a customer with the following persona:

Name: ${persona.name}
Personality: ${persona.persona_type}
Communication Style: ${persona.communication_style}
Financial Situation: ${persona.financial_situation}
Attitude Towards Debt: ${persona.attitude_towards_debt}
Personality Traits: ${persona.personality_traits.join(', ')}
Triggers: ${persona.triggers.join(', ')}
Preferred Outcome: ${persona.preferred_outcome}

Conversation so far:
${conversationHistory}

Generate your response as this customer. Stay in character and respond naturally.
React authentically based on what the bot just said and your persona.
Keep it concise (1-3 sentences max).
Return ONLY the message, no additional formatting.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating customer response:', error);
      return 'I don\'t have the money right now.';
    }
  }

  private shouldEndConversation(message: string, conversationHistory: string): boolean {
    const endPhrases = [
      'goodbye',
      'have a good day',
      'thank you for your time',
      'i\'ll call back',
      'stop calling',
      'talk to my lawyer',
      'hanging up',
      'end of call',
    ];

    const messageLower = message.toLowerCase();

    // Check for explicit end phrases
    for (const phrase of endPhrases) {
      if (messageLower.includes(phrase)) {
        return true;
      }
    }

    // Check if conversation is too long
    const turnCount = (conversationHistory.match(/\nBot:/g) || []).length;
    if (turnCount > config.maxConversationTurns) {
      return true;
    }

    return false;
  }
}
