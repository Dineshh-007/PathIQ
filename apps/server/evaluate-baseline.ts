import { config } from 'dotenv';
config({ path: '../../.env' });
import { prisma } from './src/config/database';
import { selectNextQuestion } from './src/services/aiInterviewerService';
import type { InterviewRole } from '@peerprep/shared-types';

async function runScenario(scenarioName: string, role: InterviewRole, answers: string[]) {
  console.log(`\n==================================================`);
  console.log(`TEST SCENARIO: ${scenarioName}`);
  console.log(`==================================================`);
  
  const previousQAs: { question: string; answer: string | null }[] = [];
  const selectedQuestionIds: string[] = [];
  const candidateQuestionsCache = await prisma.question.findMany({ where: { role, approved: true } });

  const allQuestionsForRole = await prisma.question.findMany({
    where: { role, approved: true },
    take: 10
  });

  for (let round = 0; round < answers.length; round++) {
    const candidateQuestions = [...allQuestionsForRole];
    
    // Shuffle
    for (let i = candidateQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateQuestions[i], candidateQuestions[j]] = [candidateQuestions[j], candidateQuestions[i]];
    }

    // Wait 10 seconds to avoid Gemini 15 RPM rate limits
    await new Promise(resolve => setTimeout(resolve, 10000));
    const nextQId = await selectNextQuestion(`test-session-${scenarioName}`, role, candidateQuestions, previousQAs);
    
    const selectedQ = candidateQuestions.find(q => q.id === nextQId);
    if (!selectedQ) {
      console.log(`Round ${round + 1}: AI returned invalid ID ${nextQId}`);
      continue;
    }

    console.log(`\nRound ${round + 1}:`);
    console.log(`Candidate Questions Provided: ${candidateQuestions.length}`);
    console.log(`AI Selected: [${selectedQ.id}] ${selectedQ.text} (Difficulty: ${selectedQ.difficulty})`);
    
    const answer = answers[round];
    console.log(`Candidate Answer: "${answer}"`);
    
    previousQAs.push({
      question: selectedQ.text,
      answer: answer
    });
    selectedQuestionIds.push(selectedQ.id);
  }

  // Check for repetitions
  const uniqueIds = new Set(selectedQuestionIds);
  console.log(`\nExact repeated questions: ${selectedQuestionIds.length - uniqueIds.size > 0 ? 'YES' : 'NO'} (${selectedQuestionIds.length} total, ${uniqueIds.size} unique)`);
}

async function main() {
  const role = 'software_engineer' as InterviewRole;
  
  const normalAnswers = [
    "I usually use SQL when I need strict schema and ACID compliance, and NoSQL for flexible JSON-like data that scales horizontally.",
    "A REST API uses HTTP methods like GET and POST to operate on resources. You should version it and use standard status codes.",
    "Git merge creates a new merge commit combining two branches, while rebase moves the feature branch's commits to the tip of main.",
    "Docker containers share the host OS kernel and are very lightweight, whereas VMs run a full guest OS on a hypervisor."
  ];

  const weakAnswers = [
    "I don't really know, maybe one is faster?",
    "An API is how computers talk.",
    "Git merge is for merging code.",
    "Docker is for running apps."
  ];

  const strongAnswers = [
    "SQL databases like PostgreSQL offer ACID transactions and relational integrity, ideal for financial data. NoSQL like MongoDB offers horizontal scaling and flexible schemas, perfect for rapid prototyping or document stores.",
    "I design REST APIs around nouns (resources). I implement idempotent PUT/DELETE methods, use standard HTTP status codes (200, 201, 400, 404, 500), and secure it with OAuth2 or JWT. I also use cursor-based pagination for performance.",
    "Merge creates a merge commit, preserving the exact history of both branches. Rebase rewrites history by placing the feature commits on top of the target branch, creating a linear history. I prefer rebase for local cleanup and merge for PRs.",
    "VMs virtualize the hardware using a hypervisor and require a full guest OS, making them heavy. Containers virtualize the OS layer, sharing the host kernel, making them start in milliseconds and use very little memory."
  ];
  
  const answerAwareAnswers = [
    "Normalization reduces redundancy and organizes data into normal forms like 1NF, 2NF, and 3NF. It splits tables to avoid anomalies.",
    "I'm not really sure about indexing, it just makes the database faster.",
    "A REST API uses HTTP. You use GET for fetching and POST for creating."
  ];

  await runScenario('NORMAL_CANDIDATE', role, normalAnswers);
  await runScenario('WEAK_CANDIDATE', role, weakAnswers);
  await runScenario('STRONG_CANDIDATE', role, strongAnswers);
  await runScenario('ANSWER_AWARENESS_AND_REPETITION', role, [...answerAwareAnswers, "I know Java OOP concepts like Inheritance and Polymorphism", "I am very good at solving graph problems using BFS"]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
