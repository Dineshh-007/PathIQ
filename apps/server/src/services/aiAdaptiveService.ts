import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/database';
import type { Question } from '@prisma/client';

const API_KEY = process.env.GEMINI_API_KEY || '';
const isEnabled = API_KEY.length > 0;
const genAI = isEnabled ? new GoogleGenerativeAI(API_KEY) : null;

export interface AdaptiveEvaluationResult {
  relevanceScore: number;
  correctnessScore: number;
  completenessScore: number;
  clarityScore: number;
  reasoningScore: number;
  overallScore: number;
  answerQuality: 'GOOD' | 'POOR' | 'PARTIALLY_CORRECT';
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendedAction: 'RELATED_FOLLOWUP' | 'ALTERNATIVE';
  nextQuestionId: string | null;
  reason: string;
}

export async function evaluateAnswerAndSelectNextQuestion(
  currentQuestion: Question,
  answer: string,
  askedQuestionIds: string[]
): Promise<AdaptiveEvaluationResult | null> {
  if (!isEnabled || !genAI) {
    console.warn('[aiAdaptiveService] GEMINI_API_KEY not set.');
    return null;
  }

  // 1. Fetch potential next questions
  const relatedQ = await prisma.question.findMany({
    where: {
      id: { in: currentQuestion.relatedQuestionIds || [], notIn: askedQuestionIds },
      active: true,
    }
  });
  
  const followupQ = await prisma.question.findMany({
    where: {
      id: { in: currentQuestion.followUpQuestionIds || [], notIn: askedQuestionIds },
      active: true,
    }
  });
  
  const alternativeQ = await prisma.question.findMany({
    where: {
      id: { in: currentQuestion.alternativeQuestionIds || [], notIn: askedQuestionIds },
      active: true,
    }
  });

  // If no related/followup/alternative, fetch random from same domain
  const sameDomainQ = await prisma.question.findMany({
    where: {
      domain: currentQuestion.domain,
      active: true,
      id: { notIn: askedQuestionIds },
    },
    take: 5
  });

  const availableQuestions = [...relatedQ, ...followupQ, ...alternativeQ, ...sameDomainQ];
  const uniqueQuestions = Array.from(new Map(availableQuestions.map(q => [q.id, q])).values());

  const questionsContext = uniqueQuestions.map(q => 
    `ID: ${q.id} | Domain: ${q.domain} | Topic: ${q.topic} | Difficulty: ${q.difficulty}\nText: ${q.text}`
  ).join('\n\n');

  const prompt = `
You are an expert technical interviewer. Evaluate the candidate's answer and select the next question.

Current Question: "${currentQuestion.text}"
Domain: ${currentQuestion.domain}, Topic: ${currentQuestion.topic}, Difficulty: ${currentQuestion.difficulty}
Expected Answer Points: ${currentQuestion.expectedAnswerPoints?.join(', ') || 'N/A'}

Candidate's Answer:
"${answer}"

Evaluate the answer on a scale of 1-10 for: relevance, correctness, completeness, clarity, reasoning.
Provide an overallScore (average of the 5).
Determine answerQuality: "GOOD" (score >= 8), "PARTIALLY_CORRECT" (score 5-7), or "POOR" (score < 5).

Based on the evaluation:
- If GOOD: recommendedAction is "RELATED_FOLLOWUP".
- If POOR: recommendedAction is "ALTERNATIVE".
- If PARTIALLY_CORRECT: Choose "RELATED_FOLLOWUP" or "ALTERNATIVE" as appropriate to reinforce learning.

Select the BEST next question from the available list below. If no question fits, return null for nextQuestionId.
Available Questions:
${questionsContext || '(None available)'}

Respond ONLY with valid JSON matching this structure exactly:
{
  "relevanceScore": number,
  "correctnessScore": number,
  "completenessScore": number,
  "clarityScore": number,
  "reasoningScore": number,
  "overallScore": number,
  "answerQuality": "GOOD" | "POOR" | "PARTIALLY_CORRECT",
  "feedback": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendedAction": "RELATED_FOLLOWUP" | "ALTERNATIVE",
  "nextQuestionId": "string" | null,
  "reason": "string"
}
`.trim();

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
    const jsonText = jsonMatch[1] || text;
    
    const parsed = JSON.parse(jsonText) as AdaptiveEvaluationResult;
    
    // Validate nextQuestionId exists in uniqueQuestions
    if (parsed.nextQuestionId && !uniqueQuestions.some(q => q.id === parsed.nextQuestionId)) {
      console.warn(`[aiAdaptiveService] AI selected invalid nextQuestionId: ${parsed.nextQuestionId}. Falling back to null.`);
      parsed.nextQuestionId = null;
    }
    
    return parsed;
  } catch (error) {
    console.error('[aiAdaptiveService] Failed to evaluate answer:', error);
    return null;
  }
}
