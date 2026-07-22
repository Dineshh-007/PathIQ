import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';
const isEnabled = API_KEY.length > 0;
const genAI = isEnabled ? new GoogleGenerativeAI(API_KEY) : null;

export interface PerformanceAnalysis {
  strengths: string[];
  weaknesses: string[];
  studyTopics: string[];
  summary: string;
}

// ─── Fallback: compute a basic analysis from raw scores (no API needed) ────────
function generateFallbackAnalysis(
  candidateName: string,
  sessions: any[]
): PerformanceAnalysis {
  const allEvals = sessions.flatMap((s) =>
    s.sessionQuestions.flatMap((sq: any) => sq.evaluations)
  );
  const scores = allEvals.map((e: any) => e.score as number);
  const avg = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  const roles = [...new Set(sessions.map((s) => s.role as string))];

  let summary: string;
  let strengths: string[];
  let weaknesses: string[];
  let studyTopics: string[];

  if (avg >= 8) {
    summary = `${candidateName} demonstrated excellent performance with an average score of ${avg.toFixed(1)}/10 across ${sessions.length} interview round(s). Strong communication and technical depth were evident throughout.`;
    strengths = ['Strong overall performance', 'Consistent high scores', 'Clear communication under pressure'];
    weaknesses = ['Minor room to deepen edge-case reasoning', 'Can further strengthen time complexity explanations', 'Continue practising system design at scale'];
    studyTopics = ['Advanced system design patterns', 'Distributed systems fundamentals', 'Behavioural interview storytelling (STAR method)', 'Data structures optimisation'];
  } else if (avg >= 6) {
    summary = `${candidateName} showed solid competence with an average score of ${avg.toFixed(1)}/10 across ${sessions.length} round(s). There are clear areas for growth that, once addressed, will significantly boost interview performance.`;
    strengths = ['Good foundational knowledge', 'Willingness to engage with hard questions', 'Reasonable problem-solving approach'];
    weaknesses = ['Answers could be more structured and concise', 'Technical depth needs strengthening in some areas', 'Time management under pressure could improve'];
    studyTopics = ['Algorithm complexity and Big-O analysis', 'Core data structures (trees, graphs, heaps)', `${roles[0] ?? 'Software engineering'} domain-specific patterns`, 'Mock interview practice with time constraints'];
  } else {
    summary = `${candidateName} is at an early stage of interview readiness with an average score of ${avg.toFixed(1)}/10 across ${sessions.length} round(s). Focused preparation in the areas below will lead to rapid improvement.`;
    strengths = ['Completed the full interview process — great for experience', 'Showed effort and engagement', 'Identified specific areas to improve'];
    weaknesses = ['Technical foundations need reinforcement', 'Answer structure needs development', 'Confidence under interview pressure needs building'];
    studyTopics = ['Fundamentals: arrays, strings, recursion', 'Object-oriented design principles', 'Practise explaining solutions out loud', 'Leetcode Easy / Medium problems daily'];
  }

  return { summary, strengths, weaknesses, studyTopics };
}

// ─── Main export ────────────────────────────────────────────────────────────────
export async function analyzeInterviewPerformance(
  candidateName: string,
  sessions: any[]
): Promise<PerformanceAnalysis> {
  // If no API key is configured, return a score-based fallback immediately
  if (!isEnabled || !genAI) {
    console.warn('[aiService] GEMINI_API_KEY not set — using fallback analysis');
    return generateFallbackAnalysis(candidateName, sessions);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Build structured context from sessions
  const questionBlocks = sessions.flatMap((session) =>
    session.sessionQuestions.map((sq: any) => {
      const evals = sq.evaluations
        .map(
          (e: any) =>
            `  - ${e.evaluator?.name ?? 'Interviewer'}: ${e.score}/10${e.feedback ? ` — "${e.feedback}"` : ''}`
        )
        .join('\n');
      const avgScore =
        sq.evaluations.reduce((acc: number, e: any) => acc + e.score, 0) /
        (sq.evaluations.length || 1);

      return `
Question: "${sq.question.text}"
Role: ${session.role}
Average Score: ${avgScore.toFixed(1)}/10
Evaluator Feedback:
${evals || '  (No written feedback)'}
      `.trim();
    })
  );

  const prompt = `
You are an expert technical interview coach. Analyze the following interview performance data for ${candidateName}.

${questionBlocks.join('\n\n---\n\n')}

Based on the scores and feedback above, provide a JSON response with exactly this structure:
{
  "summary": "A 2-3 sentence overall performance summary",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "studyTopics": ["specific topic to study 1", "specific topic to study 2", "specific topic to study 3", "specific topic to study 4"]
}

Guidelines:
- Be specific and constructive, not generic
- strengths and weaknesses should reference actual interview content where possible  
- studyTopics should be precise technical topics, not vague advice
- Do NOT include any text outside the JSON object
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from potential markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    const parsed: PerformanceAnalysis = JSON.parse(jsonText);
    return parsed;
  } catch (err) {
    // API call failed (quota, network, etc.) — degrade gracefully
    console.error('[aiService] Gemini API call failed, using fallback:', err);
    return generateFallbackAnalysis(candidateName, sessions);
  }
}

