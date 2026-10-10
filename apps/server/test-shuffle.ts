import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  const finalQuestions = await prisma.question.findMany({ take: 2 });
  console.log("Before:", finalQuestions.map(q => q.id));
  for (let i = finalQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
  }
  console.log("After:", finalQuestions.map(q => q.id));
}
test().finally(() => prisma.$disconnect());
