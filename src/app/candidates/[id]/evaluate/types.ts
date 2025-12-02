import type { Candidate, Position } from '@/lib/types';

export interface EvaluationQuestion {
  id: string;
  traitId: string;
  traitName: string;
  groupName: string;
  description: string;
  shortDescription?: string;
  score: number;
  notes: string;
}

export interface EvaluationFormData {
  candidate: Candidate;
  position?: Position;
  questions: EvaluationQuestion[];
  currentQuestionIndex: number;
  overallScore: number;
  comments: string;
}

export interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  avatarUrl?: string | null;
  positionTitle?: string;
}

export interface TestingResult {
  id: string;
  label: string;
  score: number;
  maxScore: number;
}

