import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';
const isEnabled = API_KEY.length > 0;
const genAI = isEnabled ? new GoogleGenerativeAI(API_KEY) : null;

import { emitTrace } from './prismService';

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
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startTime;
    const text = result.response.text().trim();

    await emitTrace(prompt, text, {
      model: 'gemini-1.5-pro',
      latencyMs: latencyMs,
      sessionId: `analysis-${candidateName.replace(/\s+/g, '-')}`
    }).catch(console.error);

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

// ─── Post-Session Question Solutions with Visual Diagrams ───────────────────────
export interface QuestionSolution {
  questionId: string;
  questionText: string;
  role: string;
  difficulty: string;
  summary: string;
  coreConcepts: string[];
  idealAnswer: string;
  diagram: string;
  diagramCaption: string;
}

export async function generateRoomSolutions(
  roomId: string,
  questions: { id: string; text: string; role: string; difficulty: string }[]
): Promise<QuestionSolution[]> {
  if (!questions || questions.length === 0) return [];

  // Fallback generation helper
  const createFallbackSolutions = (): QuestionSolution[] => {
    return questions.map((q) => ({
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: `Mastering key concepts and trade-offs for: "${q.text.slice(0, 60)}..."`,
      coreConcepts: ['Core Architecture', 'Trade-offs & Constraints', 'Best Practices'],
      idealAnswer: `To answer "${q.text}" effectively:\n\n1. Clarify requirements and operational constraints.\n2. Outline the fundamental architecture and principles.\n3. Discuss edge-cases, error handling, and performance trade-offs.\n4. Summarize with real-world production considerations.`,
      diagram: `graph TD
  A["Client Input"] --> B["System Core"]
  B --> C["Processing & Logic"]
  C --> D["Validation & Output"]`,
      diagramCaption: 'High-Level Execution & Architecture Flow',
    }));
  };

  if (!isEnabled || !genAI) {
    console.warn('[aiService] GEMINI_API_KEY not configured — using fallback solution guide');
    return createFallbackSolutions();
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const model = genAI.getGenerativeModel({ model: modelName });

  const questionsList = questions
    .map((q, i) => `Question ${i + 1} (ID: ${q.id}, Role: ${q.role}, Difficulty: ${q.difficulty}):\n"${q.text}"`)
    .join('\n\n');

  const prompt = `
You are a Principal Software Architect and Lead Technical Interview Coach.
For each technical interview question listed below, generate an authoritative solution guide along with an intuitive Mermaid.js diagram.

Questions Asked in the Session:
${questionsList}

For EVERY question, provide:
1. "summary": A crisp 2-sentence explanation of what interviewers are testing.
2. "coreConcepts": Array of 3-4 key technical concepts (e.g. ["ACID guarantees", "Leader-Follower Replication"]).
3. "idealAnswer": Comprehensive, well-structured model answer explaining how to excel at this question (use clear bullet points, trade-offs, and best practices).
4. "diagram": A valid Mermaid.js graph (use \`graph TD\` or \`sequenceDiagram\`) representing the architecture, data flow, or lifecycle for this question. IMPORTANT: Ensure node labels only use alphanumeric characters or double quotes without nested quotes (e.g. A["Node Label"] --> B["Next Step"]). Do NOT wrap in backticks inside the JSON string.
5. "diagramCaption": A 1-sentence caption explaining the diagram.

Return your response strictly as a JSON array of objects with this exact structure:
[
  {
    "questionId": "exact question ID",
    "summary": "...",
    "coreConcepts": ["...", "..."],
    "idealAnswer": "...",
    "diagram": "graph TD\\n  A[Step 1] --> B[Step 2]",
    "diagramCaption": "..."
  }
]

Do not include any text outside the JSON array.
  `.trim();

  try {
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startTime;
    const text = result.response.text().trim();

    await emitTrace(prompt, text, {
      model: modelName,
      latencyMs,
      sessionId: `solutions-${roomId}`,
    }).catch(console.error);

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
    const jsonText = jsonMatch[1] || text;
    const parsed = JSON.parse(jsonText) as any[];

    return questions.map((q) => {
      const match = parsed.find((p) => p.questionId === q.id) || {};
      return {
        questionId: q.id,
        questionText: q.text,
        role: q.role,
        difficulty: q.difficulty,
        summary: match.summary || `Analysis and solution guide for: ${q.text.slice(0, 50)}...`,
        coreConcepts: Array.isArray(match.coreConcepts) ? match.coreConcepts : ['System Design', 'Performance', 'Trade-offs'],
        idealAnswer: match.idealAnswer || 'Focus on architectural clarity, algorithmic trade-offs, and clear communication.',
        diagram: match.diagram || `graph TD\n  A["Input"] --> B["Process"]\n  B --> C["Output"]`,
        diagramCaption: match.diagramCaption || 'Solution Architecture Flow',
      };
    });
  } catch (err: any) {
    console.error('[aiService] Failed to generate AI solutions, using fallback:', err);
    return createFallbackSolutions();
  }
}


