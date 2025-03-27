// src/types/quiz.types.ts

export interface Option {
  _id: string;
  text: string;
  isCorrect?: boolean;
}

export type QuestionType = 'singleChoice' | 'multipleChoice' | 'text' | 'code';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ExperienceLevel = 'junior' | 'mid' | 'senior';

export interface Question {
  _id: string;
  questionText: string;
  type: QuestionType;
  category?: string;
  difficultyLevel: DifficultyLevel;
  options?: Option[];
  expectedAnswer?: string;
}

export interface Section {
  title: string;
  description?: string;
  questions: Question[];
}

export interface CandidateInfo {
  name: string;
  skillMatchPercent?: number;
}

export interface QuizData {
  _id: string;
  title: string;
  description?: string;
  timeLimit?: number; // en minutes
  sections: Section[];
  candidateInfo?: CandidateInfo;
  requirement?: any;
  requirementData?: {
    description?: string;
    [key: string]: any;
  };
  focusAreas?: string[];
  difficultyAdjustment?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Alias Quiz pour compatibilité avec le code existant
export type Quiz = QuizData;

export interface QuizSummary {
  quizId: string;
  title: string;
  sections: number;
  totalQuestions: number;
  candidateInfo: {
    name: string;
    skillMatchPercent: number;
  };
  difficultyAdjustment: string;
  focusAreas: string[];
}

export interface Requirements {
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  requiredTools: string[];
  experienceLevel: ExperienceLevel;
  [key: string]: any;
}

export interface QuizGeneratorProps {
  onQuizGenerated?: (quiz: QuizData | QuizSummary) => void;
}

export interface QuizViewerProps {
  quiz: QuizData;
  mode?: 'admin' | 'preview';
  onSendToCandidate?: () => void;
}

export interface QuizRespondentProps {
  quizId: string;
  candidateView?: boolean;
}

export interface QuizManagerProps {
  initialTab?: 'generate' | 'preview' | 'respond';
  initialQuizId?: string;
}

export interface Answer {
  questionId: string;
  answer: string | string[] | null;
}

export interface QuizResponseData {
  quizId: string;
  answers: Answer[];
  timeSpent?: number | null;
}

// Interfaces spécifiques pour les fonctionnalités anti-triche
export interface SecurityInfo {
  tabSwitches: number;
  phoneDetections: number;
  submittedDueToTabSwitch: boolean;
  submittedDueToPhoneDetection: boolean;
}