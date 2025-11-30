/**
 * Persona Types and Interfaces
 */

export interface Persona {
  name: string;
  age: number;
  occupation: string;
  financial_situation: string;
  personality_traits: string[];
  communication_style: string;
  reason_for_default: string;
  attitude_towards_debt: string;
  likely_responses: string[];
  negotiation_approach: string;
  pain_points: string[];
  triggers: string[];
  preferred_outcome: string;
  persona_type: string;
}

export interface ConversationTurn {
  turn: number;
  speaker: 'bot' | 'customer';
  message: string;
  timestamp?: Date;
}

export interface MetricsResult {
  negotiation_effectiveness: {
    score: number;
    weight: number;
    description: string;
  };
  response_relevance: {
    score: number;
    weight: number;
    description: string;
  };
}

export interface AnalysisResult {
  metrics: MetricsResult;
  overall_score: number;
  conversation_length: number;
  bot_message_count: number;
  customer_message_count: number;
  improvement_suggestions: string[];
}

export interface TestResult {
  persona: Persona;
  conversation: ConversationTurn[];
  analysis: AnalysisResult;
}

export interface IterationResult {
  iteration: number;
  script: string;
  test_results: AnalysisResult[];
  average_score: number;
  num_tests: number;
}

export interface FinalReport {
  session_id: string;
  timestamp: string;
  total_iterations: number;
  threshold_score: number;
  iterations: {
    iteration: number;
    average_score: number;
    num_tests: number;
  }[];
  final_score: number;
  threshold_reached: boolean;
  improvement: number;
}
