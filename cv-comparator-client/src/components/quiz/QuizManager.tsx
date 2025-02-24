import React, { useState } from 'react';
import { fetchAuthApi } from '../../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { QuizData, QuizSummary, QuizManagerProps } from '@/types/quiz';
import QuizGenerator from './QuizGenerator';
import QuizViewer from './QuizViewer';

const QuizManager: React.FC<QuizManagerProps> = ({ 
  initialTab = 'generate',
  initialQuizId
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'preview'>(initialTab as 'generate' | 'preview');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
  const [quizId, setQuizId] = useState<string | undefined>(initialQuizId);
  
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
    }
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestionnaire de Quiz</h1>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'generate' | 'preview')} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="generate">Génération</TabsTrigger>
          <TabsTrigger value="preview">Prévisualisation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <QuizGenerator onQuizGenerated={handleQuizGenerated} />
        </TabsContent>
        
        <TabsContent value="preview">
          {/* console.log("État actuel - selectedQuiz:", selectedQuiz, "quizId:", quizId) */}
          {selectedQuiz ? (
            <QuizViewer 
              quiz={selectedQuiz} 
              mode="admin" 
              onSendToCandidate={() => {}} 
            />
          ) : quizId ? (
            // Si on a un ID mais pas le quiz chargé, on affiche un état de chargement
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              Chargement du quiz en cours...
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              Veuillez d'abord générer un quiz
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuizManager;