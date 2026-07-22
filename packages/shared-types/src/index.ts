// ─── Enums ────────────────────────────────────────────────────────────────────

export type InterviewRole =
  | 'software_engineer'
  | 'ai_engineer'
  | 'data_analyst'
  | 'web_developer'
  | 'cybersecurity_engineer'
  | 'devops_engineer';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type RoomStatus = 'waiting' | 'active' | 'completed';

export type SessionPhase =
  | 'role_selection'
  | 'voting'
  | 'answering'
  | 'evaluating'
  | 'reveal'
  | 'completed';

export type AwardCategory =
  | 'best_technical'
  | 'best_communicator'
  | 'best_critical_thinker'
  | 'best_interviewer';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  totalSessions: number;
  averageScore: number;
}

export interface AuthPayload {
  id: string;
  name: string;
  email: string;
}

// ─── Room ─────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  maxParticipants: number;
  participants: Participant[];
  createdAt: string;
}

export interface Participant {
  userId: string;
  name: string;
  avatarUrl?: string;
  seatOrder: number;
  isConnected: boolean;
  isReady: boolean;
}

// ─── Questions ────────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  text: string;
  role: InterviewRole;
  difficulty: Difficulty;
}

// ─── Interview Session ────────────────────────────────────────────────────────

export interface InterviewSession {
  id: string;
  roomId: string;
  intervieweeId: string;
  intervieweeName: string;
  role: InterviewRole;
  roundNumber: number; // 1–5
  questionNumber: number; // 1 or 2
  phase: SessionPhase;
  candidateQuestions: Question[]; // 5 options shown to interviewers
  selectedQuestion: Question | null;
  leadInterviewerUserId: string;
  votes: Record<string, string>; // { userId: questionId }
  timerEndsAt: string | null; // ISO timestamp
  timerDuration: number; // seconds
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export interface Evaluation {
  evaluatorId: string;
  evaluatorName: string;
  score: number; // 1–10
  feedback: string;
}

export interface EvaluationReveal {
  sessionQuestionId: string;
  evaluations: Evaluation[];
  averageScore: number;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface ParticipantResult {
  userId: string;
  name: string;
  avatarUrl?: string;
  totalScore: number;
  averageScore: number;
  rank: number;
  questionScores: { questionId: string; questionText: string; average: number }[];
  feedbackReceived: Evaluation[];
  awardsReceived: AwardCategory[];
}

export interface RoomResults {
  roomId: string;
  participants: ParticipantResult[];
  awardWinners: Record<AwardCategory, string>; // category → userId
  completedAt: string;
}

// ─── Socket Events (Client → Server) ─────────────────────────────────────────

export interface ClientToServerEvents {
  // Room
  'room:join': (data: { roomCode: string; token: string }) => void;
  'room:ready': () => void;
  'room:start': () => void; // host only
  'room:leave': () => void;

  // Interview
  'interview:select_role': (data: { role: InterviewRole }) => void;
  'interview:vote': (data: { questionId: string }) => void;
  'interview:answer_done': (data?: { answerText?: string }) => void; // interviewee signals done or submits text

  // Evaluation
  'evaluation:submit': (data: {
    sessionQuestionId: string;
    score: number;
    feedback: string;
  }) => void;

  // Awards
  'awards:vote': (data: { nomineeId: string; category: AwardCategory }) => void;
  'awards:submit_all': () => void;

  // AI
  'ai:request_analysis': () => void;
}

// ─── Socket Events (Server → Client) ─────────────────────────────────────────

export interface ServerToClientEvents {
  // Room
  'room:state': (room: Room) => void;
  'room:participant_joined': (participant: Participant) => void;
  'room:participant_left': (userId: string) => void;
  'room:participant_ready': (userId: string) => void;
  'room:participant_reconnected': (userId: string) => void;
  'room:session_starting': () => void;
  'room:ended': () => void;

  // Interview
  'interview:session_start': (session: InterviewSession) => void;
  'interview:reconnect_sync': (session: InterviewSession) => void;
  'interview:role_selected': (data: { role: InterviewRole }) => void;
  'interview:voting_start': (session: InterviewSession) => void;
  'interview:vote_cast': (data: { userId: string; voteCount: number }) => void;
  'interview:question_selected': (question: Question) => void;
  'interview:answer_start': (data: {
    timerEndsAt: string;
    leadInterviewerUserId: string;
  }) => void;
  'interview:answer_tick': (secondsLeft: number) => void;
  'interview:answer_end': () => void;
  'interview:evaluation_start': (data?: { answerText?: string }) => void;
  'interview:evaluation_progress': (data: {
    submitted: number;
    total: number;
  }) => void;
  'interview:scores_revealed': (reveal: EvaluationReveal) => void;
  'interview:turn_complete': (data: { averageScore: number }) => void;
  'interview:rotation': (session: InterviewSession) => void;

  // Awards
  'awards:voting_start': () => void;
  'awards:vote_cast': (data: { category: AwardCategory; count: number }) => void;

  // Results
  'results:ready': (results: RoomResults) => void;

  // AI
  'ai:analysis_ready': (data: {
    userId: string;
    strengths: string[];
    weaknesses: string[];
    studyTopics: string[];
    summary: string;
  }) => void;
  'ai:analysis_error': (message: string) => void;

  // System
  'error': (message: string) => void;
  'notification': (data: { type: 'info' | 'warning' | 'success'; message: string }) => void;
}
