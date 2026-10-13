import { GoogleGenerativeAI } from '@google/generative-ai';
import { emitTrace } from './prismService';

function getGenAI(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  return new GoogleGenerativeAI(apiKey);
}

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
  const genAI = getGenAI();
  // If no API key is configured, return a score-based fallback immediately
  if (!genAI) {
    console.warn('[aiService] GEMINI_API_KEY not set — using fallback analysis');
    return generateFallbackAnalysis(candidateName, sessions);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

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
      model: modelName,
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

// Rich, question-tailored fallback knowledge engine
function getBespokeFallback(q: { id: string; text: string; role: string; difficulty: string }): QuestionSolution {
  const lower = q.text.toLowerCase();

  if (lower.includes('consistent hashing') || lower.includes('virtual node') || lower.includes('hash ring')) {
    return {
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: 'Consistent hashing maps data keys and servers to a circular 32-bit hash ring to minimize key remapping when nodes scale.',
      coreConcepts: ['Consistent Hash Ring', 'Virtual Nodes (vnodes)', 'Minimal Key Migration', 'Hotspot Prevention', 'Uniform Distribution'],
      idealAnswer: `Consistent hashing solves the catastrophic cache invalidation problem of standard modulo hashing (hash(key) % N), where changing N forces almost 100% of keys to remap.\n\n1. Hash Ring Mechanics: Both physical server identifiers and data keys are mapped onto a 360-degree circular integer range (e.g., 0 to 2^32 - 1). A key is assigned to the nearest server encountered moving clockwise.\n2. Scale-Out & Fault Tolerance: When a server is added or removed, only keys located between that node and its immediate predecessor need to move (an average of K/N keys).\n3. Hotspot Prevention via Virtual Nodes: In simple consistent hashing, uneven node placement creates severe data skew. By allocating multiple 'virtual nodes' (typically 100–300 per physical server) across the ring, key distribution achieves near-perfect uniformity, and heterogeneous servers can be assigned virtual nodes proportional to their hardware specs.`,
      diagram: `graph TD
  K["Incoming Request Key"] --> H["Hash Function: hash(key)"]
  H --> Ring["Consistent Hash Ring (0 to 2^32-1)"]
  Ring -->|Clockwise Traversal| VN1["Virtual Node A-1"]
  VN1 --> S1["Physical Cache Server A"]
  Ring -->|Next Segment| VN2["Virtual Node B-1"]
  VN2 --> S2["Physical Cache Server B"]`,
      diagramCaption: 'Consistent Hashing: Clockwise Ring Lookup with Virtual Node Mapping',
    };
  }

  if (lower.includes('cap theorem') || lower.includes('partition tolerance')) {
    return {
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: 'The CAP theorem states that a distributed datastore can guarantee at most two of Consistency, Availability, and Partition Tolerance.',
      coreConcepts: ['Consistency (Linearizability)', 'Availability', 'Network Partition Tolerance', 'PACELC Theorem', 'CP vs AP Architecture'],
      idealAnswer: `In real-world networks, network partitions (P) are unavoidable due to packet drops, routing loops, or hardware failures. Therefore, system design is a choice between Consistency (C) and Availability (A) during a partition.\n\n1. CP Systems (Consistency over Availability): When a partition occurs, nodes reject writes or block reads if they cannot guarantee quorum consistency (e.g., Google Spanner, HBase, CockroachDB with Raft).\n2. AP Systems (Availability over Consistency): Every non-failing node returns a response immediately, sacrificing strong consistency in favor of eventual consistency and conflict reconciliation (e.g., Apache Cassandra, Amazon DynamoDB, Couchbase).\n3. PACELC Extension: In normal non-partitioned operation (Else), systems must also balance Latency (L) versus Consistency (C). Production systems frequently tune consistency levels on a per-query basis (e.g., QUORUM vs ONE in Cassandra).`,
      diagram: `graph TD
  Partition["Network Partition Occurs (P is unavoidable)"] --> Decision{"System Design Trade-off"}
  Decision -->|Prioritize Strong Consistency| CP["CP System: Block Inconsistent Writes (e.g. Raft, CockroachDB)"]
  Decision -->|Prioritize 100% Uptime| AP["AP System: Accept Writes & Reconcile Eventually (e.g. Cassandra, DynamoDB)"]`,
      diagramCaption: 'CAP Theorem: Architectural Decision Tree During Network Partition',
    };
  }

  if (lower.includes('lsm') || lower.includes('b-tree') || lower.includes('storage engine')) {
    return {
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: 'LSM-Trees optimize for high write throughput using append-only logs and memory tables, while B-Trees optimize for fast read queries using in-place updates.',
      coreConcepts: ['LSM-Tree (Log-Structured Merge)', 'B-Tree In-Place Updates', 'MemTable & WAL', 'SSTables & Compaction', 'Write Amplification vs Read Latency'],
      idealAnswer: `Database storage engines represent a fundamental trade-off between write amplification and read performance:\n\n1. LSM-Trees (Write-Optimized): Writes are sequentially appended to a Write-Ahead Log (WAL) and stored in an in-memory balanced tree (MemTable). When full, MemTables are flushed to disk as immutable Sorted String Tables (SSTables). Background compaction merges sorted runs. Reads require checking MemTable, Bloom filters, and SSTables.\n2. B-Trees (Read-Optimized): Data is organized into fixed-size pages (typically 4KB–16KB) structured as a balanced tree. Updates modify pages in-place on disk with write-locks. Reads require a single logarithmic tree descent (O(log N)), providing fast, predictable read latencies.\n3. Production Choice: Use LSM-Trees (RocksDB, Cassandra, ClickHouse) for high-frequency write/ingestion workloads. Use B-Trees (PostgreSQL, MySQL InnoDB) for balanced OLTP with frequent random reads and point lookups.`,
      diagram: `graph LR
  Write["Client Write"] --> WAL["Write-Ahead Log (Disk)"]
  Write --> Mem["MemTable (RAM)"]
  Mem -->|Flush when full| SST["Immutable SSTable (Disk)"]
  SST --> Comp["Background Compaction & Merge"]`,
      diagramCaption: 'LSM-Tree Sequential Write Pipeline and SSTable Compaction',
    };
  }

  if (lower.includes('quicksort') || lower.includes('mergesort') || lower.includes('time complexity')) {
    return {
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: 'QuickSort is an in-place partition-based sort with O(N log N) average time, while MergeSort provides guaranteed O(N log N) stability at the expense of O(N) auxiliary memory.',
      coreConcepts: ['QuickSort In-Place Partitioning', 'MergeSort Stability', 'Pivot Selection & Worst-Case O(N^2)', 'Cache Locality', 'External Sorting'],
      idealAnswer: `1. QuickSort Complexity: Best Case O(N log N), Average Case O(N log N), Worst Case O(N^2) (occurs when the chosen pivot is consistently the minimum or maximum element, such as sorting an already-sorted array with naive pivot selection).\n2. Mitigating Worst Case: Modern engines use randomized pivots or 'median-of-three' partitioning, and introspective sort (Introsort) which switches to Heapsort if recursion depth exceeds 2*log(N).\n3. When to Prefer MergeSort: \n   - When algorithmic stability is strictly required (preserving order of duplicate keys).\n   - When sorting linked lists or disk-resident datasets (External MergeSort) where sequential access is significantly faster than random access.\n   - When a strict, guaranteed O(N log N) upper bound is required without variance.`,
      diagram: `graph TD
  Arr["Input: [7, 2, 9, 4, 1, 5]"] --> Pivot["Choose Pivot: 5"]
  Pivot --> Left["Left (< 5): [2, 4, 1]"]
  Pivot --> Right["Right (>= 5): [7, 9]"]
  Left --> SortL["Recursively Partition Left"]
  Right --> SortR["Recursively Partition Right"]
  SortL --> Combined["Concatenate: [1, 2, 4] + [5] + [7, 9]"]
  SortR --> Combined`,
      diagramCaption: 'QuickSort In-Place Divide-and-Conquer Partitioning Flow',
    };
  }

  if (lower.includes('churn') || lower.includes('saas') || lower.includes('machine learning')) {
    return {
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: 'Building a SaaS churn prediction engine requires temporal feature engineering from telemetry data, addressing class imbalance, and model explainability.',
      coreConcepts: ['Feature Engineering', 'Temporal Data Leakage Prevention', 'Class Imbalance (SMOTE / ScalePosWeight)', 'Gradient Boosted Trees (XGBoost)', 'SHAP Value Explainability'],
      idealAnswer: `1. Problem Framing: Define churn precisely (e.g. account cancellation or 30 days without active seat engagement) and establish a rolling observation window to prevent temporal data leakage.\n2. Feature Engineering: Capture user velocity (login frequency drop, feature usage decay), billing signals (failed payment retries, tier downgrade attempts), and support ticket sentiment analysis.\n3. Model Selection: Train Gradient Boosted Decision Trees (XGBoost / LightGBM) evaluated using PR-AUC (Precision-Recall Area Under Curve) due to high class imbalance (~3–5% churn rate).\n4. Production Actionability: Compute SHAP values for individual customer predictions to generate explanatory risk drivers (e.g. 'Customer X churn risk 85% driven by 60% drop in dashboard exports') allowing Customer Success to intervene proactively.`,
      diagram: `graph LR
  Telemetry["User Telemetry & Billing Events"] --> Pipeline["Feature Pipeline (Velocity & Usage Deltas)"]
  Pipeline --> Model["XGBoost / LightGBM Classifier"]
  Model --> Score["Churn Probability (0.0 to 1.0)"]
  Score --> SHAP["SHAP Explainability Engine"]
  SHAP --> Action["Customer Success Automated Alert"]`,
      diagramCaption: 'End-to-End SaaS Churn Prediction & Explainability Pipeline',
    };
  }

  if (lower.includes('join') || lower.includes('sql') || lower.includes('inner join')) {
    return {
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: 'SQL joins merge tuples across relational tables based on join predicates, differing in how unmatched records are preserved.',
      coreConcepts: ['INNER JOIN (Intersection)', 'LEFT JOIN (Preserve Left)', 'FULL OUTER JOIN (Complete Union)', 'Join Execution Plans', 'NULL Semantics'],
      idealAnswer: `1. INNER JOIN: Returns only rows where the join condition evaluates to TRUE in both tables. Any unmatched row in either table is excluded.\n   Example: SELECT * FROM users u INNER JOIN orders o ON u.id = o.user_id;\n\n2. LEFT JOIN (LEFT OUTER JOIN): Returns all rows from the left table. If a row has matching records in the right table, right columns are populated; otherwise, right columns are populated with NULL.\n   Example: SELECT * FROM users u LEFT JOIN orders o ON u.id = o.user_id;\n\n3. FULL OUTER JOIN: Returns all rows from both tables. When rows match, they combine; when unmatched, NULLs are filled for the missing side.\n   Example: SELECT * FROM users u FULL OUTER JOIN orders o ON u.id = o.user_id;\n\n4. Query Engine Execution: Under the hood, RDBMS query planners pick Nested Loop Joins for small datasets with indexes, Hash Joins for large unsorted sets, or Merge Joins for pre-sorted inputs.`,
      diagram: `graph TD
  T1["Left Table: Users"] --> JoinEngine{"Join Operator (Predicate: u.id = o.user_id)"}
  T2["Right Table: Orders"] --> JoinEngine
  JoinEngine -->|INNER| R1["Only Rows with Matching IDs in Both"]
  JoinEngine -->|LEFT| R2["All Users + Orders (NULL if no order)"]
  JoinEngine -->|FULL OUTER| R3["All Users + All Orders (NULL padded)"]`,
      diagramCaption: 'Relational Join Operator Evaluation and Output Cardinality',
    };
  }

  if (lower.includes('deadlock') || lower.includes('coffman')) {
    return {
      questionId: q.id,
      questionText: q.text,
      role: q.role,
      difficulty: q.difficulty,
      summary: 'A deadlock occurs when two or more threads are permanently blocked waiting for resources held by each other under the four Coffman conditions.',
      coreConcepts: ['Coffman 4 Conditions', 'Lock Ordering Hierarchy', 'tryLock with Timeouts', 'Wait-For Graph Detection', 'Resource Preemption'],
      idealAnswer: `1. The Four Coffman Conditions: Deadlock can only arise if all four conditions hold simultaneously: (1) Mutual Exclusion, (2) Hold and Wait, (3) No Preemption, and (4) Circular Wait.\n2. Prevention Strategies:\n   - Eliminate Circular Wait: Enforce a global lock ordering hierarchy (e.g. always acquire Resource A before Resource B across all threads).\n   - Eliminate Hold and Wait: Acquire all required locks atomically at once, or release held locks before requesting new ones.\n   - Timeout / Non-blocking Acquisition: Use tryLock(timeout) rather than unbounded blocking locks; back off and retry upon failure.\n3. Detection and Recovery: Maintain a runtime Wait-For Graph (WFG). When cycle detection algorithms find a directed cycle, abort or preempt one of the participating transactions/threads.`,
      diagram: `graph TD
  T1["Thread 1"] -->|Holds Lock| R1["Resource A"]
  T1 -.->|Blocked Waiting For| R2["Resource B"]
  T2["Thread 2"] -->|Holds Lock| R2
  T2 -.->|Blocked Waiting For| R1
  subgraph Cycle["Circular Wait Dependency (Coffman #4)"]
    R1 -.-> T1
    R2 -.-> T2
  end`,
      diagramCaption: 'Deadlock Circular Wait Dependency Graph Between Threads and Resources',
    };
  }

  // Fallback for general architecture / algorithms
  return {
    questionId: q.id,
    questionText: q.text,
    role: q.role,
    difficulty: q.difficulty,
    summary: `Architectural breakdown and design trade-offs for: "${q.text.slice(0, 60)}..."`,
    coreConcepts: ['Core Architecture', 'Operational Constraints', 'Performance Bottlenecks', 'Production Best Practices'],
    idealAnswer: `To master "${q.text}":\n\n1. Functional Scope & Requirements: Clearly define data structures, throughput expectations, and operational constraints.\n2. Core Mechanics: Walk through the algorithmic lifecycle, component interaction, and state transitions step-by-step.\n3. Edge Cases & Resilience: Address error handling, race conditions, memory limits, and failover mechanics.\n4. Production Trade-offs: Contrast latency vs throughput, consistency vs availability, and memory overhead in distributed deployments.`,
    diagram: `graph TD
  In["Input Request / Signal"] --> Router["API Gateway / Coordinator"]
  Router --> Engine["Core Processing Engine"]
  Engine --> Store[("Persistent State Store")]
  Store --> Out["Validated Response / Event"]`,
    diagramCaption: 'System Execution & Lifecycle Architecture Flow',
  };
}

// Single-question solution generator with Gemini model fallback
async function generateSingleQuestionSolution(
  q: { id: string; text: string; role: string; difficulty: string },
  roomId: string,
  genAI: GoogleGenerativeAI
): Promise<QuestionSolution> {
  const models = [
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
  ];

  const prompt = `
You are a Principal Software Architect and Lead Technical Interviewer.
Provide the definitive official solution for this technical interview question:
Question: "${q.text}"
Role: ${q.role}
Difficulty: ${q.difficulty}

Return a valid JSON object strictly matching this schema:
{
  "summary": "Crisp 2-sentence explanation of what interviewers are testing and key takeaway.",
  "coreConcepts": ["tag1", "tag2", "tag3", "tag4"],
  "idealAnswer": "Comprehensive, deep model answer explaining how to excel at this question, covering core mechanics, step-by-step reasoning, trade-offs, and production considerations.",
  "diagram": "graph TD\\n  ... valid Mermaid.js graph specifically illustrating the architecture or data flow of this concept ...",
  "diagramCaption": "Caption describing the diagram"
}

IMPORTANT RULES FOR THE MERMAID DIAGRAM:
- Must specifically illustrate "${q.text.slice(0, 40)}" (NOT a generic client-server diagram).
- Use valid Mermaid syntax (e.g. \`graph TD\` or \`sequenceDiagram\`).
- Node labels MUST use double quotes with simple text (e.g. A["Node Text"] --> B["Next Step"]). Do NOT use nested quotes or unquoted parentheses.
- Do NOT wrap in markdown backticks inside the JSON string.

Strictly output raw valid JSON only.
`.trim();

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const startTime = Date.now();

      const generateWithTimeout = Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout on ${modelName}`)), 12000)
        ),
      ]);

      const result = await generateWithTimeout;
      const latencyMs = Date.now() - startTime;
      const text = result.response.text().trim();

      await emitTrace(prompt, text, {
        model: modelName,
        latencyMs,
        sessionId: `solutions-${roomId}-${q.id}`,
      }).catch(console.error);

      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
      const jsonText = jsonMatch[1] || text;
      const parsed = JSON.parse(jsonText);

      return {
        questionId: q.id,
        questionText: q.text,
        role: q.role,
        difficulty: q.difficulty,
        summary: parsed.summary || `Analysis and guide for: ${q.text.slice(0, 50)}...`,
        coreConcepts: Array.isArray(parsed.coreConcepts) && parsed.coreConcepts.length > 0
          ? parsed.coreConcepts
          : ['System Design', 'Core Architecture', 'Trade-offs'],
        idealAnswer: parsed.idealAnswer || getBespokeFallback(q).idealAnswer,
        diagram: parsed.diagram || getBespokeFallback(q).diagram,
        diagramCaption: parsed.diagramCaption || getBespokeFallback(q).diagramCaption,
      };
    } catch (err: any) {
      console.warn(`[aiService] Model ${modelName} failed for question "${q.text.slice(0, 30)}...":`, err?.message || err);
      // Try next model in loop
    }
  }

  // If all models failed, use bespoke fallback
  console.log(`[aiService] Using bespoke fallback solution for question "${q.text.slice(0, 40)}..."`);
  return getBespokeFallback(q);
}

export async function generateRoomSolutions(
  roomId: string,
  questions: { id: string; text: string; role: string; difficulty: string }[]
): Promise<QuestionSolution[]> {
  if (!questions || questions.length === 0) return [];

  const genAI = getGenAI();
  if (!genAI) {
    console.warn('[aiService] GEMINI_API_KEY not configured — using bespoke solution guide');
    return questions.map(q => getBespokeFallback(q));
  }

  // Generate each question solution concurrently in parallel
  console.log(`[aiService] Generating parallel AI solutions for ${questions.length} questions...`);
  const solutions = await Promise.all(
    questions.map(q => generateSingleQuestionSolution(q, roomId, genAI))
  );

  return solutions;
}


