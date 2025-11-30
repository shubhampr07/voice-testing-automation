/**
 * Self-Correction Engine: Automatically improves bot script based on test results
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisResult } from './types';

import { config } from './config';

export class SelfCorrectionEngine {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.geminiModel });
  }

  async improveScript(
    currentScript: string,
    testResults: AnalysisResult[],
    iteration: number
  ): Promise<string> {
    console.log(`\nSelf-Correction Engine - Iteration ${iteration}`);

    // Aggregate insights from all test results
    const insights = this.aggregateInsights(testResults);

    // Generate improved script
    const improvedScript = await this.generateImprovedScript(currentScript, insights, iteration);

    console.log(`✅ Generated improved script for iteration ${iteration}\n`);

    return improvedScript;
  }

  private aggregateInsights(testResults: AnalysisResult[]) {
    let totalScore = 0;
    const allSuggestions: string[] = [];
    const metricScores = {
      negotiation_effectiveness: [] as number[],
      response_relevance: [] as number[],
    };

    for (const result of testResults) {
      totalScore += result.overall_score;
      allSuggestions.push(...result.improvement_suggestions);

      metricScores.negotiation_effectiveness.push(result.metrics.negotiation_effectiveness.score);
      metricScores.response_relevance.push(result.metrics.response_relevance.score);
    }

    const avgScore = totalScore / testResults.length;

    const avgMetrics = {
      negotiation_effectiveness:
        metricScores.negotiation_effectiveness.reduce((a, b) => a + b, 0) /
        metricScores.negotiation_effectiveness.length,
      response_relevance:
        metricScores.response_relevance.reduce((a, b) => a + b, 0) / metricScores.response_relevance.length,
    };

    // Find weakest metric
    const weakestMetric = Object.entries(avgMetrics).reduce((min, [key, value]) =>
      value < min[1] ? [key, value] : min
    );

    return {
      average_score: avgScore,
      average_metrics: avgMetrics,
      weakest_metric: weakestMetric[0],
      weakest_metric_score: weakestMetric[1],
      all_suggestions: allSuggestions,
      test_count: testResults.length,
    };
  }

  private async generateImprovedScript(
    currentScript: string,
    insights: any,
    iteration: number
  ): Promise<string> {
    const suggestionsText = insights.all_suggestions.map((s: string) => `- ${s}`).join('\n');

    const prompt = `
You are an expert at optimizing debt collection bot scripts.

Current Bot Script (Iteration ${iteration}):
${currentScript}

Performance Analysis:
- Average Overall Score: ${insights.average_score.toFixed(2)}/100
- Test Count: ${insights.test_count}
- Weakest Area: ${insights.weakest_metric} (Score: ${insights.weakest_metric_score.toFixed(2)}/100)

Average Metric Scores:
- Negotiation Effectiveness: ${insights.average_metrics.negotiation_effectiveness.toFixed(2)}/100
- Response Relevance: ${insights.average_metrics.response_relevance.toFixed(2)}/100

Improvement Suggestions from Testing:
${suggestionsText}

Task: Rewrite and improve the bot script to address these issues.

Requirements:
1. Maintain the core structure and purpose
2. Address the weakest metric (${insights.weakest_metric}) specifically
3. Incorporate the improvement suggestions
4. Enhance negotiation strategies - show more empathy, offer payment plans, handle objections better
5. Improve response relevance - stay on topic, address customer questions directly
6. Keep the script clear and actionable for the bot
7. Maintain professional and empathetic tone
8. Ensure legal compliance (FDCPA)

Return ONLY the improved script, no additional commentary or formatting.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let improvedScript = response.text().trim();

      // Remove markdown formatting if present
      improvedScript = improvedScript.replace(/```/g, '').trim();

      return improvedScript;
    } catch (error) {
      console.error('Error generating improved script:', error);
      return currentScript;
    }
  }
}
