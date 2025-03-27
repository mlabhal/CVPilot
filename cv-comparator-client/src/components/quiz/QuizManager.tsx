import React, { useState } from 'react';
import { fetchAuthApi } from '../../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { QuizData, QuizSummary, QuizManagerProps } from '@/types/quiz';
import QuizGenerator from './QuizGenerator';
import QuizViewer from './QuizViewer';
import { Loader2 } from 'lucide-react';

const QuizManager: React.FC<QuizManagerProps> = ({ 
  initialTab = 'generate',
  initialQuizId
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'preview'>(initialTab as 'generate' | 'preview');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
  const [quizId, setQuizId] = useState<string | undefined>(initialQuizId);
  const [isLoading, setIsLoading] = useState<boolean>(initialQuizId ? true : false);
  
  const handleQuizGenerated = (quiz: QuizData | QuizSummary) => {
    // Si on reçoit seulement un résumé avec l'ID, on met à jour l'ID
    if ('quizId' in quiz) {
      setQuizId(quiz.quizId);
      // Charger le quiz complet depuis l'API
      fetchQuiz(quiz.quizId);
    } else {
      // Si on reçoit le quiz complet
      setSelectedQuiz(quiz);
      setQuizId(quiz._id);
    }
    setActiveTab('preview');
  };
  
  // Fonction pour charger un quiz complet par son ID
  const fetchQuiz = async (id: string) => {
    try {
      setIsLoading(true);
      console.log("Tentative de récupération du quiz:", id);
      
      // fetchAuthApi renvoie directement les données JSON
      const response = await fetchAuthApi(`/quiz/${id}`);
      
      console.log("Réponse reçue:", response);
      
      // Extraire le quiz depuis la réponse API
      // Si la réponse a un format du type { success: true, data: { ... } }
      const data = response.success && response.data ? response.data : response;
      
      console.log("Quiz extrait:", data);
      
      // Le quiz a déjà une propriété 'sections', donc pas besoin d'adaptation
      setSelectedQuiz(data);
    } catch (error) {
      console.error('Erreur lors du chargement du quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Si nous avons un ID initial, charger le quiz au montage du composant
  React.useEffect(() => {
    if (initialQuizId) {
      fetchQuiz(initialQuizId);
    }
  }, [initialQuizId]);
  
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'generate' | 'preview')} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="generate">Génération</TabsTrigger>
          <TabsTrigger value="preview">Prévisualisation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <QuizGenerator onQuizGenerated={handleQuizGenerated} />
        </TabsContent>
        
        <TabsContent value="preview">
          {selectedQuiz ? (
            <QuizViewer 
              quiz={selectedQuiz} 
              mode="admin" 
              onSendToCandidate={() => {}} 
            />
          ) : isLoading || quizId ? (
            // Animation de chargement améliorée
            <div className="p-8 bg-white rounded-lg shadow flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-800">Chargement du quiz en cours...</p>
              <p className="text-sm text-gray-500 mt-2">Nous préparons les questions pour vous</p>
              <div className="w-64 h-2 bg-gray-200 rounded-full mt-6 overflow-hidden">
                <div className="h-full bg-indigo-600 animate-pulse rounded-full"></div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-lg font-medium text-gray-800">Veuillez d'abord générer un quiz</p>
              <p className="text-sm text-gray-500 mt-2">Utilisez l'onglet "Génération" pour créer un nouveau quiz</p>
              <button 
                onClick={() => setActiveTab('generate')} 
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
              >
                Aller à la génération
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuizManager;