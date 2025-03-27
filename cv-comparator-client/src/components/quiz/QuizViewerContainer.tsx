import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchAuthApi } from '../../services/api';
import QuizViewer from './QuizViewer';

const MAUVE_COLOR = "#6366F1";

const QuizViewerContainer: React.FC = () => {
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const quizId = location.pathname.split('/').pop() || '';
  
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Si les données sont passées via l'état de la navigation 
        if (location.state?.quiz) {
          setQuiz(location.state.quiz);
          setIsLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Veuillez vous connecter pour générer un quiz');
        }

        const data = await fetchAuthApi(`/quiz/${quizId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
              }
        });
        setQuiz(data);
        
      } catch (err) {
        console.error('Erreur lors du chargement du quiz:', err);
        
        // Typage correct de l'erreur
        if (err instanceof Error) {
          // C'est une erreur standard de JavaScript
          setError(err.message);
        } else if (typeof err === 'object' && err !== null && 'response' in err) {
          // C'est probablement une erreur Axios
          const axiosError = err as { response?: { status: number } };
          if (axiosError.response?.status === 401) {
            localStorage.removeItem('token');
            setError('Session expirée. Veuillez vous reconnecter.');
          } else {
            setError('Erreur lors du chargement du quiz');
          }
        } else {
          // Fallback pour tout autre type d'erreur
          setError('Une erreur inattendue est survenue');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId, location]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 mt-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: MAUVE_COLOR }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 mt-6">
        <p className="text-red-500">Erreur: {error}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-8 mt-6">
        <p className="text-gray-500">Quiz non trouvé</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <QuizViewer 
        quiz={quiz} 
        mode="admin" 
        onSendToCandidate={() => {}} 
      />
    </div>
  );
};

export default QuizViewerContainer;