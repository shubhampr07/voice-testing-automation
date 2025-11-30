/**
 * Persona Generator: Creates diverse loan defaulter personalities
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona } from './types';
import { config } from './config';

export class PersonaGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.geminiModel });
  }

  async generatePersona(personaType: string): Promise<Persona> {
    const prompt = `
Generate a detailed loan defaulter persona for testing a debt collection voice agent.

Persona Type: ${personaType}

Create a realistic persona with the following details in JSON format:
{
  "name": "Full name",
  "age": age,
  "occupation": "Current job or employment status",
  "financial_situation": "Brief description of their financial state",
  "personality_traits": ["trait1", "trait2", "trait3"],
  "communication_style": "How they communicate",
  "reason_for_default": "Why they defaulted on the loan",
  "attitude_towards_debt": "Their attitude about the debt",
  "likely_responses": ["response1", "response2", "response3"],
  "negotiation_approach": "How they approach negotiation",
  "pain_points": ["pain1", "pain2"],
  "triggers": ["trigger1", "trigger2"],
  "preferred_outcome": "What they want from the conversation"
}

Make it realistic and varied. The persona should behave like a real person in debt.
Return ONLY the JSON, no additional text.
`;

    try {

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean up the response
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const personaData = JSON.parse(cleanedText);
      personaData.persona_type = personaType;

      return personaData;
    } catch (error) {
      console.error('Error generating persona:', error);
      return this.getFallbackPersona(personaType);
    }
  }

  async generateMultiplePersonas(count?: number): Promise<Persona[]> {
    const personas: Persona[] = [];
    
    if (count === undefined) {
      // Generate one of each type
      for (const personaType of config.personaTypes) {
        console.log(`Generating persona: ${personaType}`);
        const persona = await this.generatePersona(personaType);
        personas.push(persona);
      }
    } else {
      // Generate random personas
      for (let i = 0; i < count; i++) {
        const personaType = config.personaTypes[Math.floor(Math.random() * config.personaTypes.length)];
        console.log(`Generating persona ${i + 1}/${count}: ${personaType}`);
        const persona = await this.generatePersona(personaType);
        personas.push(persona);
      }
    }
    
    return personas;
  }

  private getFallbackPersona(personaType: string): Persona {
    return {
      name: 'John Doe',
      age: 35,
      occupation: 'Unemployed',
      financial_situation: 'Struggling financially',
      personality_traits: ['defensive', 'stressed', 'uncertain'],
      communication_style: 'Evasive and short responses',
      reason_for_default: 'Lost job recently',
      attitude_towards_debt: 'Acknowledges but can\'t pay',
      likely_responses: ['I don\'t have money', 'I\'ll pay when I can', 'Stop calling me'],
      negotiation_approach: 'Avoidant',
      pain_points: ['unemployment', 'family pressure'],
      triggers: ['threats', 'aggressive tone'],
      preferred_outcome: 'Payment plan or extension',
      persona_type: personaType,
    };
  }
}
