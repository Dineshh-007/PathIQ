import { GoogleGenerativeAI } from '@google/generative-ai';
import { emitTrace } from './prismService';
import type { Question } from '@prisma/client';

const API_KEY = process.env.GEMINI_API_KEY || '';
const isEnabled = API_KEY.length > 0;
const genAI = isEnabled ? new GoogleGenerativeAI(API_KEY) : null;

export async function selectNextQuestion(
  sessionId: string,
  role: string,
  candidateQuestions: Question[],
  previousQAs: { question: string; answer: string | null }[]
): Promise<string> {
  // Fallback if no API key or no questions provided
  if (!isEnabled || !genAI || candidateQuestions.length === 0) {
    console.warn('[aiInterviewerService] GEMINI_API_KEY not set or no candidate questions, falling back to first question.');
    return candidateQuestions[0].id;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Prepare the context for the prompt
  const questionsList = candidateQuestions
    .map(q => `ID: ${q.id}\nText: ${q.text}\nDifficulty: ${q.difficulty}`)
    .join('\n\n');

  let previousContext = 'This is the first question of the interview.';
  if (previousQAs.length > 0) {
    previousContext = 'Previous questions and answers in this interview:\n' + previousQAs
      .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || '(No answer provided)'}`)
      .join('\n\n');
  }

  const prompt = `
You are an expert technical interviewer conducting an interview for the role of ${role}.
Your task is to select the most appropriate NEXT question for the candidate from a provided list of candidate questions.

${previousContext}

Available Candidate Questions to choose from:
${questionsList}

Based on the interview context, choose exactly one question from the list above.
Return your choice as a JSON object with this exact structure:
{
  "questionId": "the ID of the question you selected",
  "reason": "a brief 1-sentence reason why this is the best next question"
}

Do not include any other text outside the JSON object.
  `.trim();

  try {
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startTime;
    const text = result.response.text().trim();

    await emitTrace(prompt, text, {
      model: 'gemini-1.5-pro',
      latencyMs: latencyMs,
      sessionId: `interview-${sessionId}`
    }).catch(console.error);

    // Parse the JSON
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
    const jsonText = jsonMatch[1] || text;
    
    const parsed = JSON.parse(jsonText);
    const selectedId = parsed.questionId;

    // Validate that the AI selected a valid ID
    if (candidateQuestions.some(q => q.id === selectedId)) {
      console.log(`[aiInterviewerService] AI selected question ${selectedId}. Reason: ${parsed.reason}`);
      return selectedId;
    } else {
      console.warn(`[aiInterviewerService] AI returned invalid question ID: ${selectedId}. Falling back to first candidate.`);
      return candidateQuestions[0].id;
    }

  } catch (err) {
    console.error('[aiInterviewerService] AI selection failed, falling back to first question:', err);
    return candidateQuestions[0].id;
  }
}

export interface AdaptiveSelectionResult {
  selectedQuestionId: string;
  score: number;
  quality: 'GOOD' | 'POOR';
  isDeepDive: boolean;
  reason: string;
}

export async function selectAdaptiveSecondQuestion(
  sessionId: string,
  role: string,
  firstQuestion: Question,
  candidateAnswer: string,
  humanScore: number | null,
  availableQuestions: Question[]
): Promise<AdaptiveSelectionResult> {
  // If no questions available
  if (availableQuestions.length === 0) {
    return {
      selectedQuestionId: firstQuestion.id,
      score: humanScore ?? 7,
      quality: (humanScore ?? 7) >= 7 ? 'GOOD' : 'POOR',
      isDeepDive: false,
      reason: 'No additional candidate questions found in database.',
    };
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

  // Fallback if no Gemini key
  if (!isEnabled || !genAI) {
    const fallbackScore = humanScore ?? 7;
    const isGood = fallbackScore >= 7;
    const selectedQ = availableQuestions[0];
    return {
      selectedQuestionId: selectedQ.id,
      score: fallbackScore,
      quality: isGood ? 'GOOD' : 'POOR',
      isDeepDive: isGood,
      reason: isGood
        ? 'Candidate scored well on question 1. Follow-up question selected.'
        : 'Candidate scored below 7. Alternative question selected.',
    };
  }

  const model = genAI.getGenerativeModel({ model: modelName });

  const questionsList = availableQuestions
    .map((q, idx) => `[Question ${idx + 1}] ID: ${q.id}\nText: ${q.text}\nDifficulty: ${q.difficulty}`)
    .join('\n\n');

  const prompt = `
You are a senior technical interviewer evaluating a candidate for the role of "${role}".

The candidate was asked Question 1:
"${firstQuestion.text}" (Difficulty: ${firstQuestion.difficulty})

Candidate's Answer:
"${candidateAnswer ? candidateAnswer.trim() : '(No written answer submitted)'}"

${humanScore !== null ? `Interviewer panel rating: ${humanScore.toFixed(1)}/10` : ''}

TASK:
1. Evaluate the candidate's answer on a scale of 1 to 10 for technical depth, correctness, and reasoning.
2. If score >= 7 (Strong / Good answer):
   - Set "isDeepDive" to true, "quality" to "GOOD".
   - Select a question from the Available Questions list that is RELEVANT to the same topic/concepts as Question 1, drilling deeper into trade-offs or advanced scenarios.
3. If score < 7 (Poor / Incomplete answer):
   - Set "isDeepDive" to false, "quality" to "POOR".
   - Select an ALTERNATIVE question from the Available Questions list that covers a DIFFERENT topic or domain area, giving the candidate a fresh opportunity.

Available Candidate Questions to choose from:
${questionsList}

Return your decision strictly as a JSON object with this exact structure:
{
  "score": number,
  "quality": "GOOD" | "POOR",
  "isDeepDive": boolean,
  "selectedQuestionId": "exact question ID from the list above",
  "reason": "1-2 sentence explanation of why this question was chosen based on their performance"
}

Do not include any text outside the JSON object.
  `.trim();

  try {
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startTime;
    const text = result.response.text().trim();

    await emitTrace(prompt, text, {
      model: modelName,
      latencyMs,
      sessionId: `adaptive-${sessionId}`,
    }).catch(console.error);

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
    const jsonText = jsonMatch[1] || text;
    const parsed = JSON.parse(jsonText);

    const score = typeof parsed.score === 'number' ? parsed.score : (humanScore ?? 7);
    const isDeepDive = typeof parsed.isDeepDive === 'boolean' ? parsed.isDeepDive : score >= 7;
    const quality = isDeepDive ? 'GOOD' : 'POOR';

    let selectedId = parsed.selectedQuestionId;
    if (!availableQuestions.some(q => q.id === selectedId)) {
      console.warn(`[aiInterviewerService] AI selected invalid question ID (${selectedId}). Defaulting to first candidate.`);
      selectedId = availableQuestions[0].id;
    }

    return {
      selectedQuestionId: selectedId,
      score,
      quality,
      isDeepDive,
      reason: parsed.reason || (isDeepDive ? 'Deeper follow-up question selected.' : 'Alternative topic question selected.'),
    };
  } catch (err: any) {
    console.error('[aiInterviewerService] Adaptive question selection error:', err);
    const fallbackScore = humanScore ?? 7;
    const isGood = fallbackScore >= 7;
    return {
      selectedQuestionId: availableQuestions[0].id,
      score: fallbackScore,
      quality: isGood ? 'GOOD' : 'POOR',
      isDeepDive: isGood,
      reason: isGood
        ? 'Good answer in Round 1. Follow-up question selected.'
        : 'Score below 7 in Round 1. Alternative question selected.',
    };
  }
}

