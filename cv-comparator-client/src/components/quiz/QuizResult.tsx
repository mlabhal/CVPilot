// src/components/QuizResult.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import quizService, { QuizSubmissionResult } from '../../services/quizService';

interface QuizResultProps {
  onReturnHome?: () => void;
}

const QuizResult: React.FC<QuizResultProps> = ({ onReturnHome }) => {
  const { submissionId } = useParams<{ submissionId: string }>();
  
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchResult = async () => {
      if (!submissionId) return;
      
      try {
        setLoading(true);
        const data = await quizService.getQuizResult(submissionId);
        setResult(data);
      } catch (err) {
        console.error(err);
        setError('Impossible de charger les résultats. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResult();
  }, [submissionId]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Chargement des résultats...</div>
      </div>
    );
  }
  
  if (error || !result) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 text-xl mb-4">{error || 'Résultats non disponibles'}</div>
        <button 
          onClick={onReturnHome} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }
  
  // Calcul du pourcentage de réussite
  const percentage = Math.round((result.score + Number.EPSILON) * 100) / 100;
  
  // Déterminer le message et la couleur en fonction du score
  const getScoreInfo = () => {
    if (percentage >= 80) {
      return {
        message: 'Excellent !',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    } else if (percentage >= 60) {
      return {
        message: 'Bien !',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      };
    } else if (percentage >= 40) {
      return {
        message: 'Moyen',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      };
    } else {
      return {
        message: 'À améliorer',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      };
    }
  };
  
  const scoreInfo = getScoreInfo();
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Résultats du Quiz</h1>
        
        <div className={`${scoreInfo.bgColor} ${scoreInfo.color} p-6 rounded-lg mb-8 text-center`}>
          <div className="text-4xl font-bold mb-2">{percentage}%</div>
          <div className="text-xl font-semibold">{scoreInfo.message}</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-lg font-medium mb-1">Réponses correctes</div>
            <div className="text-3xl font-bold">{result.correctAnswers}</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-lg font-medium mb-1">Total des questions</div>
            <div className="text-3xl font-bold">{result.totalQuestions}</div>
          </div>
        </div>
        
        {/* Vous pourriez ajouter ici des sections supplémentaires comme:
            - Détail par catégorie
            - Suggestions d'amélioration
            - Questions échouées avec explications
        */}
        
        <div className="flex justify-center mt-6">
          <button 
            onClick={onReturnHome} 
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;