import { fetchCandidateQuestions } from './src/services/questionService';
import { prisma } from './src/config/database';

async function main() {
  console.log('Testing software_engineer...');
  const res1 = await fetchCandidateQuestions('software_engineer' as any, 'dummy-room', 'dummy-user');
  console.log('software_engineer questions length:', res1.length);
  
  console.log('Testing web_developer...');
  const res2 = await fetchCandidateQuestions('web_developer' as any, 'dummy-room', 'dummy-user');
  console.log('web_developer questions length:', res2.length);
  
  process.exit(0);
}

main().catch(console.error);
