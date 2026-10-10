import { GoogleGenerativeAI } from '@google/generative-ai';
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

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

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
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
    const jsonText = jsonMatch[1] || text;
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error(`[aiInterviewerService] AI returned invalid JSON. Model: ${modelName}. Error: ${String(parseErr)}. Fallback: ${candidateQuestions[0].id}`);
      return candidateQuestions[0].id;
    }
    
    const selectedId = parsed.questionId;

    // Validate that the AI selected a valid ID
    if (candidateQuestions.some(q => q.id === selectedId)) {
      console.log(`[aiInterviewerService] AI selected question ${selectedId}. Reason: ${parsed.reason}`);
      return selectedId;
    } else {
      console.error(`[aiInterviewerService] AI returned invalid question ID: ${selectedId}. Model: ${modelName}. Fallback: ${candidateQuestions[0].id}`);
      return candidateQuestions[0].id;
    }

  } catch (err: any) {

    console.error(`[aiInterviewerService] AI question selection failed\nModel: ${modelName}\nError: ${err.message || String(err)}\nFallback: ${candidateQuestions[0].id}`);

    return candidateQuestions[0].id;
  }
}
