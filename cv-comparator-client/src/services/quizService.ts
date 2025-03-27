// src/services/quizService.ts
import axios from 'axios';

// Types
export interface Option {
  _id: string;
  text: string;
}

export interface Question {
  _id: string;
  questionText: string;
  type: 'singleChoice' | 'multipleChoice' | 'text';
  category: string;
  difficultyLevel: string;
  options?: Option[];
}

export interface Section {
  title: string;
  description: string;
  questions: Question[];
}

export interface Quiz {
  _id: string;
  title: string;
  description: string;
  timeLimit: number;
  sections: Section[];
}

export interface Answer {
  questionId: string;
  answer: string | string[] | null;
}

export interface QuizSubmissionResult {
  submissionId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

const API_URL = import.meta.env.VITE_API_URL || '';
/**
 * Service pour gérer les interactions avec l'API de quiz
 */
const quizService = {
  /**
   * Récupère la version candidat d'un quiz
   * @param quizId - L'identifiant du quiz
   */
  getCandidateQuiz: async (quizId: string): Promise<Quiz> => {
    try {
      const response = await axios.get(`${API_URL}/api/quiz/${quizId}/candidate`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Erreur lors de la récupération du quiz');
    } catch (error) {
      console.error('Erreur dans getCandidateQuiz:', error);
      throw error;
    }
  },

  /**
   * Soumet les réponses d'un candidat à un quiz
   * @param quizId - L'identifiant du quiz
   * @param candidateId - L'identifiant du candidat
   * @param answers - Les réponses du candidat
   */
  submitQuizAnswers: async (
    quizId: string,
    candidateId: string,
    answers: Answer[]
  ): Promise<QuizSubmissionResult> => {
    try {
      const response = await axios.post(`${API_URL}/api/quiz/${quizId}/submissions`, {
        candidateId,
        answers
      });

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Erreur lors de la soumission des réponses');
    } catch (error) {
      console.error('Erreur dans submitQuizAnswers:', error);
      throw error;
    }
  },

  /**
   * Récupère les résultats d'une soumission de quiz
   * @param submissionId - L'identifiant de la soumission
   */
  getQuizResult: async (submissionId: string): Promise<QuizSubmissionResult> => {
    try {
      const response = await axios.get(`${API_URL}/api/quiz/submissions/${submissionId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Erreur lors de la récupération des résultats');
    } catch (error) {
      console.error('Erreur dans getQuizResult:', error);
      throw error;
    }
  }
};

export default quizService;