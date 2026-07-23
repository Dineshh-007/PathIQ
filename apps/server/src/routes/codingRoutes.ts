import { FastifyInstance } from 'fastify';
import { prisma } from '../config/database';

export default async function codingRoutes(app: FastifyInstance) {
  // Create a new coding room
  app.post('/api/coding/rooms', async (req, reply) => {
    try {
      const { interviewerId, candidateId } = req.body as { interviewerId: string; candidateId: string };
      
      const room = await prisma.codingRoom.create({
        data: {
          interviewerId,
          candidateId,
          status: 'waiting',
          sessions: {
            create: {
              phase: 'proposing',
              proposedQIds: [],
              codeSnapshot: '',
              language: 'javascript'
            }
          }
        },
        include: {
          sessions: true
        }
      });

      return { room };
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  // Get a coding room
  app.get('/api/coding/rooms/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      
      const room = await prisma.codingRoom.findUnique({
        where: { id },
        include: {
          sessions: true,
          interviewer: { select: { id: true, name: true, avatarUrl: true } },
          candidate: { select: { id: true, name: true, avatarUrl: true } },
        }
      });

      if (!room) {
        return reply.status(404).send({ error: 'Coding room not found' });
      }

      return { room };
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  // Get categorized coding questions
  app.get('/api/coding/questions', async (req, reply) => {
    try {
      const questions = await prisma.codingQuestion.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
        },
        orderBy: { category: 'asc' }
      });
      
      return { questions };
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  // Execute code via Piston API (Free, secure Docker execution)
  app.post('/api/coding/execute', async (req, reply) => {
    try {
      const { code, language } = req.body as { code: string; language: string };
      
      const langMap: Record<string, { language: string, version: string }> = {
        'javascript': { language: 'javascript', version: '18.15.0' },
        'python': { language: 'python', version: '3.10.0' },
        'java': { language: 'java', version: '15.0.2' },
        'cpp': { language: 'c++', version: '10.2.0' },
      };

      const runtime = langMap[language] || langMap['javascript'];

      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [{ content: code }],
          stdin: '',
          compile_timeout: 10000,
          run_timeout: 3000,
          compile_memory_limit: -1,
          run_memory_limit: -1,
        })
      });

      const data = (await response.json()) as any;
      
      if (data.compile && data.compile.code !== 0) {
        return { output: '', error: data.compile.output };
      }
      return { output: data.run?.output ?? '', error: data.run?.stderr ?? '' };

    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });
}
