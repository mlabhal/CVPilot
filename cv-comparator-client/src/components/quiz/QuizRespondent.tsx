// components/quiz/QuizRespondent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, Clock, CheckCircle, Info, ArrowRight, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { QuizRespondentProps, QuizData, Question, Section, Answer, QuizResponseData } from '@/types/quiz';
import { API_BASE_URL } from '../../services/api';

const QuizRespondent: React.FC<QuizRespondentProps> = ({ 
  quizId, 
  candidateView = true 
}) => {
  // États pour le quiz et la progression
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [confirmSubmit, setConfirmSubmit] = useState<boolean>(false);
  
  // Timer pour le temps restant
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Charger le quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {

        const token =localStorage.getItem('token');
        if (!token) {
          throw new Error('Veuillez vous connecter pour accéder au quiz');
        }
        // Utiliser la version candidat de l'API
        const url = candidateView 
          ? `${API_BASE_URL}/quiz/${quizId}/candidate`
          : `${API_BASE_URL}/quiz/${quizId}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {

          if (response.status==401){
            throw new Error('Session expirée. Veuillez vous reconnecter')
          }
          throw new Error('Erreur lors du chargement du quiz');
        }
        
        const result = await response.json();
        setQuiz(result.data);
        
        // Initialiser le temps restant si le quiz a une limite de temps
        if (result.data.timeLimit) {
          setRemainingTime(result.data.timeLimit * 60); // Conversion en secondes
        }
        
        // Initialiser la structure de réponses
        const initialAnswers: Record<string, Answer> = {};
        result.data.sections.forEach((section:Section, sIndex:number) => {
          section.questions.forEach((question:Question, qIndex:number) => {
            const questionId = question._id;
            initialAnswers[questionId] = {
              type: question.type,
              value: question.type === 'multipleChoice' 
                ? [] 
                : question.type === 'singleChoice' 
                  ? null 
                  : '',
              sectionIndex: sIndex,
              questionIndex: qIndex
            };
          });
        });
        setAnswers(initialAnswers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuiz();
    
    // Nettoyage
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizId, candidateView]);
  
  // Démarrer le timer une fois le quiz chargé
  useEffect(() => {
    if (quiz && quiz.timeLimit && remainingTime !== null) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev !== null && prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            // Soumettre automatiquement le quiz quand le temps est écoulé
            handleSubmit();
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quiz]);
  
  // Formatage du temps restant
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  // Calculer la progression globale
  const calculateProgress = (): number => {
    if (!quiz) return 0;
    
    let answeredCount = 0;
    let totalCount = 0;
    
    quiz.sections.forEach((section:Section) => {
      section.questions.forEach((question:Question) => {
        totalCount++;
        const answer = answers[question._id];
        if (answer) {
          if (
            (answer.type === 'text' && typeof answer.value === 'string' && answer.value.trim() !== '') ||
            (answer.type === 'code' && typeof answer.value === 'string' && answer.value.trim() !== '') ||
            (answer.type === 'multipleChoice' && Array.isArray(answer.value) && answer.value.length > 0) ||
            (answer.type === 'singleChoice' && answer.value !== null)
          ) {
            answeredCount++;
          }
        }
      });
    });
    
    return Math.round((answeredCount / totalCount) * 100);
  };
  
  // Handler pour la réponse aux questions
  const handleSingleChoiceAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        value: value
      }
    }));
  };
  
  const handleMultipleChoiceAnswer = (questionId: string, value: string) => {
    setAnswers(prev => {
      const currentAnswer = prev[questionId];
      const currentValues = Array.isArray(currentAnswer.value) ? currentAnswer.value : [];
      
      let newValues: string[];
      if (currentValues.includes(value)) {
        // Retirer la valeur si elle existe déjà
        newValues = currentValues.filter(v => v !== value);
      } else {
        // Ajouter la valeur si elle n'existe pas
        newValues = [...currentValues, value];
      }
      
      return {
        ...prev,
        [questionId]: {
          ...currentAnswer,
          value: newValues
        }
      };
    });
  };
  
  const handleTextAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        value: value
      }
    }));
  };
  
  // Navigation entre les questions
  const goToNextQuestion = () => {
    if (!quiz) return;
    
    const currentSectionQuestions = quiz.sections[currentSection].questions;
    
    if (currentQuestion < currentSectionQuestions.length - 1) {
      // Aller à la question suivante dans la section actuelle
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentSection < quiz.sections.length - 1) {
      // Aller à la première question de la section suivante
      setCurrentSection(currentSection + 1);
      setCurrentQuestion(0);
    }
  };
  
  const goToPrevQuestion = () => {
    if (!quiz) return;
    
    if (currentQuestion > 0) {
      // Aller à la question précédente dans la section actuelle
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentSection > 0) {
      // Aller à la dernière question de la section précédente
      setCurrentSection(currentSection - 1);
      setCurrentQuestion(quiz.sections[currentSection - 1].questions.length - 1);
    }
  };
  
  // Soumission du quiz
  const handleSubmit = async (): Promise<void> => {
    if (!quiz) return;
    
    setIsSubmitting(true);
    
    try {
      const quizResponse: QuizResponseData = {
        quizId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer: answer.value,
        })),
        timeSpent: quiz.timeLimit && remainingTime !== null ? (quiz.timeLimit * 60) - remainingTime : null,
      };
      
      const response = await fetch('/api/quiz-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quizResponse),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la soumission des réponses');
      }
      
      // Arrêter le timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
      setConfirmSubmit(false);
    }
  };
  
  // Affichage pendant le chargement
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du quiz...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Affichage en cas d'erreur
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Affichage si le quiz n'est pas disponible
  if (!quiz) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Quiz non disponible</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Affichage après soumission
  if (submitted) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Quiz soumis avec succès !</h2>
          <p className="text-gray-600 mb-6">
            Merci d'avoir complété ce quiz. Vos réponses ont bien été enregistrées.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Récupérer la question actuelle
  const currentQuestionData = quiz.sections[currentSection].questions[currentQuestion];
  
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{quiz.title}</CardTitle>
              <CardDescription>
                {quiz.description || 'Quiz personnalisé'}
              </CardDescription>
            </div>
            
            {/* Affichage du timer si applicable */}
            {remainingTime !== null && (
              <div className={`flex items-center px-3 py-1 rounded-full border ${
                remainingTime < 300 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                <Clock className="mr-2 h-4 w-4" />
                <span className="font-mono font-medium">{formatTime(remainingTime)}</span>
              </div>
            )}
          </div>
          
          {/* Barre de progression */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression: {calculateProgress()}%</span>
              <span>
                Question {currentQuestion + 1}/{quiz.sections[currentSection].questions.length} (Section {currentSection + 1}/{quiz.sections.length})
              </span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
          
          {/* Navigation des sections */}
          <Tabs
            value={`section-${currentSection}`}
            onValueChange={(value) => {
              const sectionIndex = parseInt(value.split('-')[1]);
              setCurrentSection(sectionIndex);
              setCurrentQuestion(0);
            }}
            className="mt-4"
          >
            <TabsList className="inline-flex w-full overflow-x-auto">
              {quiz.sections.map((section, index) => (
                <TabsTrigger
                  key={`section-${index}`}
                  value={`section-${index}`}
                  className="flex-shrink-0"
                >
                  {section.title || `Section ${index + 1}`}
                  <Badge className="ml-2" variant="outline">
                    {section.questions.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          {/* Affichage de la question courante */}
          <div className="mb-6 p-4 border rounded-lg bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center mb-2">
                  <Badge variant="outline" className="mr-2">
                    Question {currentQuestion + 1}
                  </Badge>
                  <Badge 
                    variant={
                      currentQuestionData.difficultyLevel === 'easy' ? 'success' :
                      currentQuestionData.difficultyLevel === 'medium' ? 'warning' : 'destructive'
                    }
                  >
                    {currentQuestionData.difficultyLevel}
                  </Badge>
                </div>
                <h3 className="text-lg font-medium">{currentQuestionData.questionText}</h3>
              </div>
            </div>
            
            {/* Question à choix unique */}
            {currentQuestionData.type === 'singleChoice' && currentQuestionData.options && (
              <div className="space-y-2 mt-4">
                {currentQuestionData.options.map((option) => (
                  <div 
                    key={option._id} 
                    className={`p-3 border rounded-md cursor-pointer transition ${
                      answers[currentQuestionData._id]?.value === option._id ? 
                      'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSingleChoiceAnswer(currentQuestionData._id, option._id)}
                  >
                    <div className="flex items-center">
                      <div className={`h-4 w-4 mr-2 rounded-full border flex-shrink-0 ${
                        answers[currentQuestionData._id]?.value === option._id ? 
                        'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                      }`}></div>
                      <span>{option.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Question à choix multiple */}
            {currentQuestionData.type === 'multipleChoice' && currentQuestionData.options && (
              <div className="space-y-2 mt-4">
                {currentQuestionData.options.map((option) => {
                  // Extraire la vérification dans une variable locale pour éviter les erreurs TypeScript
                  const isSelected = 
                    Array.isArray(answers[currentQuestionData._id]?.value) && 
                    answers[currentQuestionData._id]?.value?.includes(option._id);
                  
                  return (
                    <div 
                      key={option._id} 
                      className={`p-3 border rounded-md cursor-pointer transition ${
                        isSelected ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleMultipleChoiceAnswer(currentQuestionData._id, option._id)}
                    >
                      <div className="flex items-center">
                        <div className={`h-4 w-4 mr-2 rounded flex-shrink-0 ${
                          isSelected ? 'bg-indigo-600 border-indigo-600' : 'border border-gray-300'
                        }`}></div>
                        <span>{option.text}</span>
                      </div>
                    </div>
                  );
                })}
                <Alert variant="default" className="bg-blue-50 border border-blue-200 text-blue-700 mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Vous pouvez sélectionner plusieurs réponses.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Question ouverte */}
            {(currentQuestionData.type === 'text' || currentQuestionData.type === 'code') && (
              <div className="mt-4">
                <Textarea
                  value={answers[currentQuestionData._id]?.value as string || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTextAnswer(currentQuestionData._id, e.target.value)}
                  placeholder={
                    currentQuestionData.type === 'code' 
                      ? 'Saisissez votre code ici...' 
                      : 'Saisissez votre réponse ici...'
                  }
                  className={currentQuestionData.type === 'code' ? 'font-mono' : ''}
                  rows={8}
                />
              </div>
            )}
          
          {/* Navigation entre les questions et bouton de soumission */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={goToPrevQuestion}
              disabled={currentSection === 0 && currentQuestion === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Question précédente
            </Button>
            
            {/* Soit question suivante, soit soumettre */}
            {(currentSection < quiz.sections.length - 1 || currentQuestion < quiz.sections[currentSection].questions.length - 1) ? (
              <Button
                variant="default"
                onClick={goToNextQuestion}
              >
                Question suivante
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setConfirmSubmit(true)}
              >
                Terminer le quiz
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal de confirmation de soumission */}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Soumettre le quiz ?</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de terminer le quiz et de soumettre vos réponses. Vous ne pourrez plus les modifier après.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
          <Alert 
            variant="default" 
            className={`
              ${calculateProgress() < 100 
                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                : 'bg-green-50 border-green-200 text-green-700'}
            `}
          >
            <Info className="h-4 w-4" />
            <AlertDescription>
              {calculateProgress() < 100
                ? `Vous avez répondu à ${calculateProgress()}% des questions.`
                : "Vous avez répondu à toutes les questions."}
            </AlertDescription>
          </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
              Continuer le quiz
            </Button>
            <Button 
              variant="default" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Soumission...' : 'Soumettre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuizRespondent;