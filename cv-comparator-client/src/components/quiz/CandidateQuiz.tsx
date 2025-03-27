// src/components/quiz/CandidateQuiz.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuthApi } from '../../services/api';
import { Quiz, Question, Answer, SecurityInfo, Option, Section} from '../../types/quiz';
import { useCameraSetup } from '../../hooks/useCameraSetup';
import { usePhoneDetection } from '../../hooks/usePhoneDetection';
import { useTabChangeDetection } from '../../hooks/useTabChangeDetection';
// Nouveaux imports pour l'enregistrement vidéo
import { useVideoRecording } from '../../hooks/useVideoRecording';
import { uploadQuizRecording } from '../../services/uploadService';
import DebugPanel from './DebugPanel';
import WebcamMonitor from './WebcamMonitor';

interface CandidateQuizProps {
  candidateId: string;
}

const CandidateQuiz: React.FC<CandidateQuizProps> = ({ candidateId }) => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  
  // États pour le quiz
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [forceRetryVisible, setForceRetryVisible] = useState(false);
  
  // État pour suivre la question actuelle
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentSection, setCurrentSection] = useState<string>('');
  
  // État pour l'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [redirected, setRedirected] = useState(false);
  
  // Référence pour éviter les problèmes avec submitQuiz
  const submitFnRef = useRef<Function | null>(null);
  
  // Gestion de la caméra - Version améliorée avec diagnostics
  const { 
    videoRef, 
    cameraActive,
    startCamera, 
    stopCamera,
    forceVideoDisplay,
    getMediaStream,        // <- Nouvelle méthode
    } = useCameraSetup({
    enabled: !!quiz && !isLoading,
    onError: (errorMsg) => setError(errorMsg)
  });
  // Effet de débogage pour suivre l'état de la référence vidéo
  useEffect(() => {
    if (cameraActive) {
      console.log("Caméra active, videoRef existe:", !!videoRef.current);
      
      if (videoRef.current) {
        console.log("videoRef.srcObject:", !!videoRef.current.srcObject);
      }
    }
  }, [cameraActive, videoRef]);
  useEffect(() => {
    // Limiter le nombre de fois où le flux est réattaché à la vidéo
    if (cameraActive && videoRef.current) {
      // Utilisation de requestAnimationFrame pour éviter les clignotements
      const rafId = requestAnimationFrame(() => {
        if (videoRef.current) {
          // Appliquer des styles pour réduire les clignotements
          videoRef.current.style.transform = 'translateZ(0)';
          videoRef.current.style.backfaceVisibility = 'hidden';
          videoRef.current.style.willChange = 'transform';
          
          // Limiter les rendus du DOM
          if (!videoRef.current.srcObject && getMediaStream()) {
            videoRef.current.srcObject = getMediaStream();
          }
        }
      });
      
      return () => cancelAnimationFrame(rafId);
    }
  }, [cameraActive, getMediaStream]);
  // Gestion de l'enregistrement vidéo
  const {
    isRecording,
    recordingTime,
    recordedBlob,
    startRecording,
    stopRecording
  } = useVideoRecording({
    videoRef,
    mediaStream: getMediaStream, // <- Passer la fonction pour obtenir le stream
    enabled: cameraActive,
    onError: (errorMsg) => setError(errorMsg)
  });
  
  // Fonction qui sera appelée par les hooks de détection
  const handleQuizSubmission = useCallback(() => {
    if (submitFnRef.current) {
      (submitFnRef.current as Function)();
    }
  }, []);
  
  // Fonction pour forcer la réinitialisation en cas de blocage
  const forceRetrySubmission = () => {
    setSubmitting(false);
    setForceRetryVisible(false);
    setError(null);
  };
  
  // Détection de téléphone
  const { 
    phoneDetected, 
    phoneDetections, 
    isLoading: modelLoading, 
    status: tfStatus,
    detectionLogs,
    debugMode
  } = usePhoneDetection({
    enabled: cameraActive,
    videoRef,
    detectionThreshold: 3,
    onPhoneDetected: handleQuizSubmission
  });
  
  // Détection de changement d'onglet
  const { 
    tabChangeCount, 
    showWarning: tabChangeWarning
  } = useTabChangeDetection({
    enabled: !!quiz && !isLoading,
    onSecondTabChange: handleQuizSubmission
  });
  
  // Version améliorée de submitQuiz avec gestion des timeouts et correction des types
  const submitQuiz = useCallback(async () => {
    if (!quiz || submitting) return;
    
    // Timeout de sécurité pour éviter le blocage indéfini
    const submissionTimeout = setTimeout(() => {
      console.error('Timeout de soumission atteint, forçage de l\'état...');
      setSubmitting(false);
      setError('La soumission a pris trop de temps. Veuillez réessayer.');
    }, 30000); // 30 secondes max pour la soumission
    
    try {
      setSubmitting(true);
      console.log('Début de la soumission du quiz...');
      
      // Arrêter l'enregistrement vidéo et récupérer le blob avec timeout
      let videoBlob = recordedBlob;
      
      if (isRecording) {
        try {
          console.log('Arrêt de l\'enregistrement vidéo en cours...');
          // Ajout d'un timeout pour l'arrêt de l'enregistrement
          const stopPromise = stopRecording();
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout d\'arrêt d\'enregistrement')), 10000)
          );
          
          // Race entre l'arrêt normal et le timeout
          const stopResult = await Promise.race([stopPromise, timeoutPromise])
            .catch(err => {
              console.warn('Problème lors de l\'arrêt de l\'enregistrement:', err);
              return null;
            });
          
          // Vérifiez que stopResult est un Blob valide avec les propriétés attendues
          if (stopResult && typeof stopResult === 'object' && 'size' in stopResult && 'type' in stopResult) {
            videoBlob = stopResult as Blob;
            console.log(`Enregistrement vidéo arrêté (taille: ${videoBlob.size} octets)`);
          } else {
            console.warn('Arrêt de l\'enregistrement sans blob vidéo valide ou timeout');
            // Utiliser le dernier blob connu si disponible
            if (recordedBlob) {
              videoBlob = recordedBlob;
              console.log('Utilisation du dernier blob vidéo enregistré');
            }
          }
        } catch (recError) {
          console.error('Erreur lors de l\'arrêt de l\'enregistrement:', recError);
          // Continuer avec le dernier blob connu
          if (recordedBlob) {
            videoBlob = recordedBlob;
            console.log('Utilisation du dernier blob vidéo enregistré malgré l\'erreur');
          }
        }
      }
      
      // Arrêter la caméra - dans un try/catch pour éviter le blocage
      try {
        stopCamera();
      } catch (cameraError) {
        console.error('Erreur lors de l\'arrêt de la caméra:', cameraError);
      }
      
      // Collecter les informations de sécurité
      const securityInfo: SecurityInfo = {
        tabSwitches: tabChangeCount,
        phoneDetections: phoneDetections,
        submittedDueToTabSwitch: tabChangeCount > 1,
        submittedDueToPhoneDetection: phoneDetections >= 2
      };
      
      console.log('Envoi des réponses au serveur...');
      
      try {
        // Ajouter un timeout pour l'appel API
        const fetchPromise = fetchAuthApi(`/quiz/${quizId}/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            candidateId,
            answers,
            securityInfo
          })
        });
        
        const fetchTimeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout d\'appel API')), 15000)
        );
        
        // Race entre l'appel API normal et le timeout
        const response = await Promise.race([fetchPromise, fetchTimeoutPromise]);
        
        if (response.success) {
          console.log('Soumission des réponses réussie, ID:', response.data.submissionId);
          
          // Si on a une vidéo, on l'envoie au serveur
          if (videoBlob && videoBlob.size > 0) {
            console.log(`Tentative d'upload vidéo (taille: ${videoBlob.size} octets, type: ${videoBlob.type})...`);
            
            try {
              // Ne pas attendre l'upload avant de rediriger
              uploadQuizRecording(
                quizId || '',
                candidateId,
                response.data.submissionId,
                videoBlob
              ).then(uploadResult => {
                if (uploadResult.success) {
                  console.log('Upload vidéo réussi:', uploadResult);
                } else {
                  console.error('Échec de l\'upload vidéo:', uploadResult.message);
                }
              }).catch(uploadError => {
                console.error('Erreur lors de l\'upload vidéo:', uploadError);
              });
              
              // Redirection immédiate après soumission réussie
              console.log('Redirection vers la page de résultats...');
              clearTimeout(submissionTimeout);
              setSubmitting(false);
              navigate(`/results/${response.data.submissionId}`);
            } catch (uploadError) {
              console.error('Erreur lors de l\'upload vidéo:', uploadError);
              // En cas d'erreur d'upload, rediriger quand même
              console.log('Redirection malgré l\'erreur d\'upload...');
              clearTimeout(submissionTimeout);
              setSubmitting(false);
              navigate(`/results/${response.data.submissionId}`);
            }
          } else {
            console.warn('Aucun blob vidéo disponible pour l\'upload');
            // Rediriger sans upload vidéo
            console.log('Redirection sans vidéo...');
            clearTimeout(submissionTimeout);
            setSubmitting(false);
            navigate(`/results/${response.data.submissionId}`);
          }
        } else {
          setError('Erreur lors de la soumission des réponses');
          console.error('Erreur de soumission:', response);
          clearTimeout(submissionTimeout);
          setSubmitting(false);
        }
      } catch (apiError) {
        console.error('Erreur lors de l\'appel API:', apiError);
        setError(`Erreur lors de la soumission: ${apiError instanceof Error ? apiError.message : 'Erreur inconnue'}`);
        clearTimeout(submissionTimeout);
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Exception globale lors de la soumission:', err);
      setError(`Erreur lors de la soumission: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      clearTimeout(submissionTimeout);
      setSubmitting(false);
    }
  }, [quiz, submitting, candidateId, quizId, answers, navigate, stopCamera, isRecording, stopRecording, recordedBlob, tabChangeCount, phoneDetections]);
  
  // Mettre à jour la référence à submitQuiz
  useEffect(() => {
    submitFnRef.current = submitQuiz;
  }, [submitQuiz]);
  
  // Effet pour afficher le bouton de déblocage après un certain temps
  useEffect(() => {
    // Afficher le bouton de déblocage après 15 secondes de soumission
    let timer: number | null = null;
    if (submitting) {
      timer = window.setTimeout(() => {
        setForceRetryVisible(true);
      }, 15000);
    }
    
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [submitting]);
  
  // Vérifier si l'utilisateur est authentifié
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Vérifier si un token existe dans le localStorage
        const token = localStorage.getItem('token');
        
        if (token) {
          setIsAuthenticated(true);
        } else {
          // Stocker l'URL pour redirection après login
          const fullPath = window.location.pathname + window.location.search;
          console.log("Stockage du chemin de redirection:", fullPath);
          localStorage.setItem('redirectAfterLogin', fullPath);
          
          // Ne pas rediriger immédiatement pour éviter des problèmes avec les hooks
          setRedirected(true);
        }
      } catch (err) {
        console.error('Erreur lors de la vérification de l\'authentification:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Effet séparé pour la redirection - important pour éviter les erreurs de hooks
  useEffect(() => {
    if (redirected && !isAuthenticated && !isLoading) {
      console.log("Redirection vers la page de connexion");
      navigate('/login');
    }
  }, [redirected, isAuthenticated, isLoading, navigate]);
  
  // Charger le quiz
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        // Vérifier une dernière fois le token avant de faire l'appel
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Token non disponible');
        }
        // Vérifier si c'est juste après l'inscription
        const justRegistered = localStorage.getItem('justRegistered') === 'true';
        if (justRegistered) {
          // Attendre un peu plus longtemps si l'utilisateur vient de s'inscrire
          await new Promise(resolve => setTimeout(resolve, 500));
          localStorage.removeItem('justRegistered');
        }
        // Récupération des données du quiz
        const data = await fetchAuthApi(`/quiz/${quizId}/candidate`);
        
        if (data.success) {
          const quizData = data.data;
          setQuiz(quizData);
          
          // Extraire toutes les questions
          const questions: Question[] = [];
          const initialAnswers: Answer[] = [];
          
          quizData.sections.forEach((section: Section) => {
            section.questions.forEach((question: Question) => {
              questions.push(question);
              // Utilisation d'une vérification de string pour éviter l'erreur de type
              const isMultiChoice = question.type === 'multipleChoice' || (question.type as string) === 'multiple_choice';
              initialAnswers.push({
                questionId: question._id,
                answer: isMultiChoice ? [] : null
              });
            });
          });
          
          setAllQuestions(questions);
          setAnswers(initialAnswers);
          
          // Définir la section initiale
          if (quizData.sections.length > 0 && questions.length > 0) {
            setCurrentSection(quizData.sections[0].title);
          }
          
          // Initialiser le temps restant
          if (quizData.timeLimit > 0) {
            setRemainingTime(quizData.timeLimit * 60); // Convertir en secondes
          }
        } else {
          setError(data.message || 'Impossible de charger le quiz');
        }
      } catch (err) {
        setError('Erreur lors du chargement du quiz');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId, isAuthenticated]);
  
  // Mettre à jour la section actuelle lorsque la question change
  useEffect(() => {
    if (quiz && allQuestions.length > 0 && currentQuestionIndex < allQuestions.length) {
      const currentQuestion = allQuestions[currentQuestionIndex];
      
      // Trouver la section qui contient la question actuelle
      for (const section of quiz.sections) {
        if (section.questions.some((q: Question) => q._id === currentQuestion._id)) {
          setCurrentSection(section.title);
          break;
        }
      }
    }
  }, [currentQuestionIndex, allQuestions, quiz]);
  
  // Gérer le décompte du temps
  useEffect(() => {
    if (!remainingTime || remainingTime <= 0) return;
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (submitFnRef.current) {
            (submitFnRef.current as Function)();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [remainingTime]);
  
  // Démarrer l'enregistrement vidéo avec vérifications améliorées
  useEffect(() => {
    const startVideoRecording = async () => {
      if (cameraActive && quiz && !isRecording && !isLoading) {
        console.log('Tentative de démarrage de l\'enregistrement vidéo');
        
        // Attendre plus longtemps pour l'initialisation complète de la caméra
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Vérification explicite du flux via getMediaStream
        const stream = getMediaStream();
        
        if (!stream || !stream.active || stream.getVideoTracks().length === 0) {
          console.warn('Flux vidéo non disponible, tentative d\'obtention directe');
          
          // Forcer le rafraîchissement de l'affichage
          forceVideoDisplay();
          
          // Attendre que le forçage prenne effet
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Nouvelle tentative d'obtention du flux
          const streamRetry = getMediaStream();
          
          if (!streamRetry || !streamRetry.active) {
            // Dernier recours: tenter d'accéder directement au flux via navigator.mediaDevices
            try {
              console.log('Tentative d\'obtention directe du flux vidéo');
              const constraints = {
                video: {
                  facingMode: 'user',
                  width: { ideal: 640 },
                  height: { ideal: 480 }
                },
                audio: false
              };
              
              const directStream = await navigator.mediaDevices.getUserMedia(constraints);
              
              // Si on obtient un flux directement, on peut démarrer l'enregistrement
              if (directStream && directStream.active && directStream.getVideoTracks().length > 0) {
                console.log('Flux obtenu directement, démarrage de l\'enregistrement');
                // Pour useVideoRecording modifié qui accepte un flux direct
                startRecording(directStream);
                return;
              } else {
                console.error('Échec de l\'obtention directe du flux');
              }
            } catch (err) {
              console.error('Erreur lors de l\'obtention directe du flux:', err);
            }
            
            console.error('Impossible de démarrer l\'enregistrement: flux vidéo non disponible après plusieurs tentatives');
            return;
          }
        } else {
          console.log('Flux vidéo disponible, démarrage de l\'enregistrement');
        }
        
        // Démarrer l'enregistrement avec le flux
        startRecording();
      }
    };
    
    startVideoRecording();
  }, [cameraActive, quiz, isRecording, isLoading, startRecording, forceVideoDisplay, getMediaStream]);
  
  // Formater le temps restant
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Mettre à jour les réponses
  const handleAnswerChange = (questionId: string, value: string | string[] | null) => {
    setAnswers(prev => 
      prev.map(a => 
        a.questionId === questionId 
          ? { ...a, answer: value } 
          : a
      )
    );
  };
  
  // Gérer les réponses à choix multiple
  const handleMultipleChoiceChange = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers(prev => {
      return prev.map(a => {
        if (a.questionId === questionId) {
          const currentAnswers = Array.isArray(a.answer) ? a.answer : [];
          let newAnswers: string[];
          
          if (checked) {
            // Ajouter l'option si elle n'est pas déjà présente
            newAnswers = [...currentAnswers, optionId];
          } else {
            // Supprimer l'option si présente
            newAnswers = currentAnswers.filter(id => id !== optionId);
          }
          
          return { ...a, answer: newAnswers };
        }
        return a;
      });
    });
  };
  
  // Gérer les réponses textuelles
  const handleTextChange = (questionId: string, text: string) => {
    handleAnswerChange(questionId, text);
  };
  
  // Navigation entre questions
  const goToNextQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Chargement du quiz...</div>;
  }
  
  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }
  
  if (!quiz || allQuestions.length === 0) {
    return <div className="text-center">Quiz non trouvé ou aucune question disponible</div>;
  }
  
  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === allQuestions.length - 1;
  
  // Helper pour vérifier le type de question
  const isChoiceQuestion = (type: string): boolean => {
    return type === 'multipleChoice' || 
           type === 'multiple_choice' || 
           type === 'singleChoice' || 
           type === 'single_choice';
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Avertissements */}
      {tabChangeWarning && (
        <div className="fixed top-0 left-0 w-full bg-red-500 text-white p-4 text-center z-50">
          Attention ! Changer d'onglet pendant le quiz entraînera la soumission automatique de vos réponses.
        </div>
      )}
      
      {phoneDetected && (
        <div className="fixed top-0 left-0 w-full bg-red-500 text-white p-4 text-center z-50">
          Attention ! L'utilisation d'un téléphone a été détectée. La répétition entraînera la soumission automatique.
        </div>
      )}
      
      {/* Status d'enregistrement vidéo */}
      {isRecording && (
        <div className="fixed top-16 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-40 flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
          <span>Enregistrement: {formatTime(recordingTime)}</span>
        </div>
      )}
      
      {/* Affichage du status du blob vidéo */}
      {recordedBlob && (
        <div className="fixed top-28 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg z-40">
          Vidéo: {Math.round(recordedBlob.size / 1024)} Ko
        </div>
      )}
      
      {/* Bouton de test d'upload en mode dév */}
      {/*
      {process.env.NODE_ENV === 'development' && recordedBlob && (
        <div className="fixed top-40 right-4 z-40">
          <button 
            onClick={testVideoUpload}
            className="bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg"
          >
            Test upload
          </button>
        </div>
      )}
      */}
      
      {/* Bouton de diagnostic caméra en mode dév */}
      {/*
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-52 right-4 z-40">
          <button 
            onClick={diagnoseCameraIssues}
            className="bg-indigo-500 text-white px-3 py-2 rounded-lg shadow-lg"
          >
            Diagnostic caméra
          </button>
        </div>
      )}
      */}
      
      {/* Panel de débogage */}
      <DebugPanel
        visible={debugMode}
        status={tfStatus}
        model={null} // Nous n'avons pas accès au modèle ici, mais on pourrait adapter l'interface
        cameraActive={cameraActive}
        phoneDetected={phoneDetected}
        phoneDetections={phoneDetections}
        detectionLogs={detectionLogs}
      />
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          {remainingTime > 0 && (
            <div className="text-xl font-mono">
              Temps restant: <span className={remainingTime < 300 ? 'text-red-500' : ''}>{formatTime(remainingTime)}</span>
            </div>
          )}
        </div>
        
        {/* Moniteur de webcam - Version améliorée avec les nouvelles props */}
        <WebcamMonitor
          videoRef={videoRef}
          isActive={cameraActive}
          isLoading={modelLoading}
          isPhoneDetected={phoneDetected}
          statusText={tfStatus}
          onRetry={startCamera}
          objectFit="contain"
          width="500px"
          height="300px"
        />
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">{currentSection}</h2>
            <div className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1} / {allQuestions.length}
            </div>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${((currentQuestionIndex + 1) / allQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="p-4 border rounded-lg mb-8">
          <div className="font-medium mb-5 text-lg">
            {currentQuestion.questionText}
          </div>
          
          <div className="ml-4">
            {isChoiceQuestion(currentQuestion.type as string) && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option: Option) => {
                  const currentAnswerObj = answers.find(a => a.questionId === currentQuestion._id);
                  const currentAnswers = Array.isArray(currentAnswerObj?.answer) ? currentAnswerObj.answer : [];
                  const isChecked = currentAnswers.includes(option._id);
                  
                  return (
                    <div key={option._id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`q-${currentQuestion._id}-${option._id}`}
                        checked={isChecked}
                        onChange={(e) => handleMultipleChoiceChange(currentQuestion._id, option._id, e.target.checked)}
                        className="mr-3 h-4 w-4"
                      />
                      <label 
                        htmlFor={`q-${currentQuestion._id}-${option._id}`} 
                        className="cursor-pointer text-base"
                      >
                        {option.text}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            {currentQuestion.type === 'text' && (
              <textarea
                value={(answers.find(a => a.questionId === currentQuestion._id)?.answer as string) || ''}
                onChange={(e) => handleTextChange(currentQuestion._id, e.target.value)}
                className="w-full p-3 border rounded"
                rows={4}
              />
            )}
            {currentQuestion.type === 'code' && (
              <textarea
                value={(answers.find(a => a.questionId === currentQuestion._id)?.answer as string) || ''}
                onChange={(e) => handleTextChange(currentQuestion._id, e.target.value)}
                className="w-full p-3 border rounded font-mono"
                rows={8}
              />
            )}
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={goToPrevQuestion}
            disabled={currentQuestionIndex === 0}
            className={`px-4 py-2 rounded ${
              currentQuestionIndex === 0 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Question précédente
          </button>
          
          {!isLastQuestion ? (
            <button
              onClick={goToNextQuestion}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Question suivante
            </button>
          ) : (
            <div className="flex flex-col items-end">
              <button
                onClick={submitQuiz}
                disabled={submitting}
                className={`px-4 py-2 rounded ${
                  submitting 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {submitting ? 'Soumission en cours...' : 'Terminer le quiz'}
              </button>
              
              {/* Bouton de déblocage qui apparaît si la soumission prend trop de temps */}
              {forceRetryVisible && submitting && (
                <button
                  onClick={forceRetrySubmission}
                  className="mt-2 text-sm text-red-500 hover:text-red-700"
                >
                  Débloquer la soumission
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateQuiz;