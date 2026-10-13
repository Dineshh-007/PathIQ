import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const additionalQuestions = [
  // ── Concurrency & Multithreading ──────────────────────────────────────────
  {
    text: 'What is the difference between a Mutex, a Semaphore, and a Spinlock? When does reader starvation occur and how do you resolve it?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Explain race conditions and how atomic operations (like Compare-And-Swap / CAS) enable lock-free data structures.',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'How does a Thread Pool work under the hood? What happens when all worker threads are busy and the task queue fills up?',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What are the four Coffman conditions required for a deadlock to occur? How do lock-ordering protocols eliminate circular wait?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is the difference between optimistic concurrency control and pessimistic locking in database transactions?',
    role: 'software_engineer',
    difficulty: 'medium',
  },

  // ── Data Structures & Algorithms ──────────────────────────────────────────
  {
    text: 'How does a Hash Table handle collisions? Compare Separate Chaining with Open Addressing (Linear Probing vs Quadratic Probing) regarding CPU cache locality.',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'Explain how a Trie (Prefix Tree) works. How would you optimize its memory footprint when building an autocomplete search system?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Explain the difference between a B-Tree and a Binary Search Tree. Why are B-Trees preferred for disk-based database storage?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'How does the QuickSelect algorithm find the k-th smallest element in an unsorted array in O(n) average time?',
    role: 'software_engineer',
    difficulty: 'medium',
  },

  // ── Distributed Systems & Databases ───────────────────────────────────────
  {
    text: 'How do distributed transactions work? Compare Two-Phase Commit (2PC) with the Saga pattern in microservices architectures.',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Explain Consistent Hashing. How do virtual nodes prevent hotspots when adding or removing cache servers in a cluster?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Explain the difference between LSM-Trees (Log-Structured Merge-Trees) and B+ Trees. Why are LSM-Trees optimized for heavy write workloads?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'What is a cache stampede (thundering herd problem), and how do probabilistic early expiration or mutex locks protect your database?',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What are database isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable)? What anomalies does each level prevent?',
    role: 'software_engineer',
    difficulty: 'hard',
  },

  // ── System Design & Scalability ───────────────────────────────────────────
  {
    text: 'Compare Token Bucket, Leaky Bucket, and Sliding Window Log rate-limiting algorithms. How would you implement distributed rate limiting with Redis?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'Design a distributed unique ID generator (like Twitter Snowflake). How does it guarantee uniqueness and chronological ordering without coordination?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
  {
    text: 'When designing an event-driven system, when would you choose Apache Kafka over RabbitMQ? Compare their delivery guarantees and persistence models.',
    role: 'software_engineer',
    difficulty: 'hard',
  },

  // ── Software Design & Clean Architecture ──────────────────────────────────
  {
    text: 'Explain the Dependency Inversion Principle vs Dependency Injection. How does inversion of control improve unit testability and reduce coupling?',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'What is the Strategy pattern? How does it differ from the State pattern, and how does it help follow the Open/Closed Principle?',
    role: 'software_engineer',
    difficulty: 'medium',
  },
  {
    text: 'How do memory allocators and garbage collectors handle memory fragmentation? What are the advantages of generational garbage collection?',
    role: 'software_engineer',
    difficulty: 'hard',
  },
];

async function seed() {
  console.log('Seeding additional questions...');
  let created = 0;
  for (const q of additionalQuestions) {
    const existing = await prisma.question.findFirst({ where: { text: q.text } });
    if (!existing) {
      await prisma.question.create({
        data: {
          text: q.text,
          role: q.role as any,
          difficulty: q.difficulty as any,
          approved: true,
        },
      });
      created++;
    }
  }
  console.log(`Successfully added ${created} new questions to the question bank!`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
