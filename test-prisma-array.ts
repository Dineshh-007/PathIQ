import { prisma } from './apps/server/src/config/database';
async function run() {
  const q = await prisma.question.findMany({ take: 3 });
  try {
    const temp = q[0];
    q[0] = q[1];
    q[1] = temp;
    console.log("Mutation succeeded!");
  } catch (e) {
    console.error("Mutation failed:", e);
  }
}
run();
