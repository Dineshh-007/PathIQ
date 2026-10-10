import { fetchCandidateQuestions } from './src/services/questionService';
import { prisma } from './src/config/database';

async function test() {
  try {
    const q = await fetchCandidateQuestions('software_engineer' as any, 'dummy-room', 'dummy-user');
    console.log(q.map(x => x.text));
  } catch (err) {
    console.error("CRASH", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
