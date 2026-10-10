import { prisma } from './src/config/database';

async function main() {
  const questions = await prisma.question.findMany();
  console.log('Total Questions:', questions.length);
  
  const roles = new Set(questions.map(q => q.role));
  console.log('Roles:', Array.from(roles));
  
  if (questions.length > 0) {
    console.log('Sample question:', JSON.stringify(questions[0], null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
