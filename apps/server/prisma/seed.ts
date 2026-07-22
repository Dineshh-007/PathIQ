import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const questions = [
  // ─── Software Engineer ────────────────────────────────────────────────────
  {
    text: 'Explain the difference between a process and a thread. When would you prefer using one over the other?',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What are the SOLID principles? Give a real-world example of applying the Single Responsibility Principle.',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'How does garbage collection work in modern languages like Java or Python? What are common memory leaks and how do you prevent them?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Design a rate limiting system for a public REST API that handles 1 million requests per day.',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Explain the CAP theorem. How does it affect your choice of database in a distributed system?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is a deadlock? Describe a scenario where it can occur and how you would prevent it.',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'Explain the difference between SQL and NoSQL databases. When should you use each?',
    role: 'software_engineer',
    difficulty: 'easy',
  },
  {
    text: 'What is the time complexity of QuickSort in the best, average, and worst case? When would you prefer MergeSort?',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'Walk me through how you would design a URL shortener like bit.ly at scale.',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What are design patterns? Describe the Observer and Factory patterns with examples.',
    role: 'software_engineer',
    difficulty: 'medium',
  },

  // ─── AI Engineer ──────────────────────────────────────────────────────────
  {
    text: 'Explain the difference between supervised, unsupervised, and reinforcement learning. Give one real-world application of each.',
    role: 'ai_engineer',
    difficulty: 'easy',
  },
  {
    text: 'What is the transformer architecture, and why did it revolutionize NLP? Explain self-attention in simple terms.',
    role: 'ai_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is overfitting and underfitting? How do regularization techniques like L1 and L2 address these issues?',
    role: 'ai_engineer',
    difficulty: 'medium',
  },
  {
    text: 'Explain how a Convolutional Neural Network works and why it is effective for image recognition tasks.',
    role: 'ai_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is the difference between a Generative Adversarial Network (GAN) and a Variational Autoencoder (VAE)?',
    role: 'ai_engineer',
    difficulty: 'hard',
  },
  {
    text: 'You are training a model and your validation loss stops improving after epoch 5. What steps would you take to diagnose and fix the problem?',
    role: 'ai_engineer',
    difficulty: 'medium',
  },
  {
    text: 'Explain RLHF (Reinforcement Learning from Human Feedback). Why is it important for LLM alignment?',
    role: 'ai_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is a confusion matrix? How do precision, recall, and F1-score differ, and when would you optimize for each?',
    role: 'ai_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is RAG (Retrieval-Augmented Generation)? How does it improve LLMs and what are its limitations?',
    role: 'ai_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Describe the bias-variance tradeoff and how it impacts your decisions when selecting a machine learning model.',
    role: 'ai_engineer',
    difficulty: 'medium',
  },

  // ─── Data Analyst ─────────────────────────────────────────────────────────
  {
    text: 'Walk me through how you would approach cleaning a dataset with 30% missing values. What strategies would you use?',
    role: 'data_analyst',
    difficulty: 'medium',
  },
  {
    text: 'What is the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN in SQL? Write an example query for each.',
    role: 'data_analyst',
    difficulty: 'easy',
  },
  {
    text: 'Explain the concept of A/B testing. How would you design an A/B test for a new website feature?',
    role: 'data_analyst',
    difficulty: 'medium',
  },
  {
    text: 'How do you detect and handle outliers in a dataset? What statistical methods do you use?',
    role: 'data_analyst',
    difficulty: 'medium',
  },
  {
    text: 'Explain the difference between correlation and causation with a real-world example.',
    role: 'data_analyst',
    difficulty: 'easy',
  },
  {
    text: 'A stakeholder asks you to increase monthly active users by 10%. How would you analyze the data to identify where to focus?',
    role: 'data_analyst',
    difficulty: 'hard',
  },
  {
    text: 'What is the difference between a data warehouse and a data lake? When would you use each?',
    role: 'data_analyst',
    difficulty: 'medium',
  },
  {
    text: 'Explain what a p-value means. How do you interpret a p-value of 0.03 in the context of hypothesis testing?',
    role: 'data_analyst',
    difficulty: 'medium',
  },
  {
    text: 'How would you build a churn prediction model for a subscription service? What features would you engineer?',
    role: 'data_analyst',
    difficulty: 'hard',
  },
  {
    text: 'Describe how you have used data visualization to communicate a complex finding to a non-technical audience.',
    role: 'data_analyst',
    difficulty: 'easy',
  },

  // ─── Web Developer ────────────────────────────────────────────────────────
  {
    text: 'Explain the critical rendering path in a browser. What specific optimizations can you make to improve page load speed?',
    role: 'web_developer',
    difficulty: 'hard',
  },
  {
    text: 'What is the difference between localStorage, sessionStorage, and cookies? When would you use each?',
    role: 'web_developer',
    difficulty: 'easy',
  },
  {
    text: 'Explain how the event loop, call stack, and microtask queue work in JavaScript.',
    role: 'web_developer',
    difficulty: 'hard',
  },
  {
    text: 'What is the difference between SSR (Server-Side Rendering), CSR (Client-Side Rendering), and SSG (Static Site Generation)? What are the trade-offs?',
    role: 'web_developer',
    difficulty: 'medium',
  },
  {
    text: 'How does React\'s virtual DOM work, and what is the reconciliation algorithm?',
    role: 'web_developer',
    difficulty: 'medium',
  },
  {
    text: 'What are WebSockets and how do they differ from HTTP polling and Server-Sent Events?',
    role: 'web_developer',
    difficulty: 'medium',
  },
  {
    text: 'Explain CORS. Why does it exist and how would you configure it properly on a Node.js server?',
    role: 'web_developer',
    difficulty: 'medium',
  },
  {
    text: 'What is Content Security Policy (CSP) and how does it protect against XSS attacks?',
    role: 'web_developer',
    difficulty: 'hard',
  },
  {
    text: 'How would you optimize a React application that has performance issues with frequent re-renders?',
    role: 'web_developer',
    difficulty: 'medium',
  },
  {
    text: 'What is a Progressive Web App (PWA)? What are service workers and how do they enable offline functionality?',
    role: 'web_developer',
    difficulty: 'medium',
  },

  // ─── Cybersecurity Engineer ───────────────────────────────────────────────
  {
    text: 'Explain the OWASP Top 10 vulnerabilities. Which one do you consider most critical today and why?',
    role: 'cybersecurity_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is SQL injection? How would you prevent it at both the application and database level?',
    role: 'cybersecurity_engineer',
    difficulty: 'easy',
  },
  {
    text: 'Describe the difference between symmetric and asymmetric encryption. Why is TLS/HTTPS critical for web security?',
    role: 'cybersecurity_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is the principle of least privilege and how do you apply it in a cloud environment like AWS?',
    role: 'cybersecurity_engineer',
    difficulty: 'medium',
  },
  {
    text: 'Explain how a zero-day vulnerability works and what your incident response process would be.',
    role: 'cybersecurity_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is the difference between IDS and IPS? How would you set up network security monitoring?',
    role: 'cybersecurity_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is a man-in-the-middle attack? How do certificate pinning and HSTS mitigate it?',
    role: 'cybersecurity_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Explain how JWT authentication works. What are common security vulnerabilities with JWT implementations?',
    role: 'cybersecurity_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is penetration testing? Walk me through the phases of an ethical pen test.',
    role: 'cybersecurity_engineer',
    difficulty: 'hard',
  },
  {
    text: 'How does OAuth 2.0 work? What is the difference between authentication and authorization?',
    role: 'cybersecurity_engineer',
    difficulty: 'medium',
  },

  // ─── DevOps Engineer ──────────────────────────────────────────────────────
  {
    text: 'Explain the concept of Infrastructure as Code (IaC). How does Terraform differ from Ansible?',
    role: 'devops_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is the difference between a Docker container and a virtual machine? How does container orchestration work?',
    role: 'devops_engineer',
    difficulty: 'easy',
  },
  {
    text: 'Explain a blue-green deployment strategy. How does it differ from canary deployments and rolling updates?',
    role: 'devops_engineer',
    difficulty: 'medium',
  },
  {
    text: 'How would you set up a CI/CD pipeline for a microservices application deployed on Kubernetes?',
    role: 'devops_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is Kubernetes and what problems does it solve? Explain Pods, Deployments, and Services.',
    role: 'devops_engineer',
    difficulty: 'medium',
  },
  {
    text: 'How do you implement observability in a distributed system? What are the three pillars and what tools do you use?',
    role: 'devops_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is a service mesh? How does Istio solve problems that Kubernetes alone cannot?',
    role: 'devops_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Describe your approach to secrets management in a production Kubernetes environment.',
    role: 'devops_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is the 12-Factor App methodology and how does it guide cloud-native application development?',
    role: 'devops_engineer',
    difficulty: 'medium',
  },
  {
    text: 'How would you design a disaster recovery plan with an RTO of 15 minutes and RPO of 5 minutes?',
    role: 'devops_engineer',
    difficulty: 'hard',
  },
];

async function main() {
  console.log('🌱 Seeding question bank...');

  // Check how many questions already exist
  const existingCount = await prisma.question.count();
  if (existingCount >= questions.length) {
    console.log(`✅ Already seeded (${existingCount} questions found). Skipping.`);
    return;
  }

  // Delete all and re-seed for a clean state
  await prisma.question.deleteMany({});

  await prisma.question.createMany({
    data: questions.map((q) => ({
      text: q.text,
      role: q.role as any,
      difficulty: q.difficulty as any,
      approved: true,
    })),
    skipDuplicates: true,
  });

  const count = await prisma.question.count();
  console.log(`✅ Seeded ${count} questions across 6 roles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
