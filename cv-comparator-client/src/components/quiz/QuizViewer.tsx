import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, Mail, Download, Eye, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { QuizViewerProps, Question, Section, Option } from '@/types/quiz';
import { fetchAuthApi } from '../../services/api';

const QuizViewer: React.FC<QuizViewerProps> = ({ 
  quiz, 
  mode = 'admin', 
  onSendToCandidate = () => {} 
}) => {
  const [activeSection, setActiveSection] = useState<number>(0);
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Vérifier si le quiz existe et a la structure attendue
  if (!quiz || !quiz.sections || quiz.sections.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Quiz invalide ou vide</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Si c'est la version admin, nous affichons les réponses
  // Si c'est la version preview, nous masquons les réponses comme les candidats les verront
  const isAdmin = mode === 'admin';
  
  // Comptage du nombre total de questions
  const totalQuestions = quiz.sections.reduce(
    (total, section) => total + section.questions.length, 
    0
  );
  
  // Fonction pour envoyer le quiz par e-mail
  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    setError(null);
    
    try {
      // Récupération du token depuis le localStorage ou autre système de gestion d'état
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Veuillez vous connecter pour générer un quiz');
      }
      setEmailSent(true);
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailSent(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSendingEmail(false);
    }
  };
  
  // Fonction pour télécharger le quiz au format PDF
  const handleDownloadPDF = async () => {
    try {
      const response = await fetchAuthApi(`/quiz/${quiz._id}/pdf`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du PDF');
      }
      
      // Créer un blob et un lien de téléchargement
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quiz.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };
  
  // Rendu d'une question individuelle
  const renderQuestion = (question: Question, index: number) => {
    return (
      <div key={question._id} className="mb-8 p-4 border rounded-lg bg-white">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <span className="mr-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-sm font-medium">
              Q{index + 1}
            </span>
            <h4 className="text-md font-medium">{question.questionText}</h4>
          </div>
          <div className="flex flex-col items-end">
            <Badge variant="outline" className="mb-1">
              {question.type}
            </Badge>
            <Badge variant={
              question.difficultyLevel === 'easy' ? 'success' :
              question.difficultyLevel === 'medium' ? 'warning' : 'destructive'
            }>
              {question.difficultyLevel}
            </Badge>
          </div>
        </div>
        
        {/* Options de réponse (pour QCM) */}
        {question.options && question.options.length > 0 && (
          <div className="mt-4 space-y-2">
            {question.options.map((option: Option, optIndex: number) => (
              <div 
                key={option._id || optIndex} 
                className={`p-2 rounded-md border ${
                  isAdmin && option.isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div className="h-4 w-4 mr-2 flex-shrink-0 rounded-full border border-gray-300 
                    bg-white"></div>
                  <span>{option.text}</span>
                  {isAdmin && option.isCorrect && (
                    <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">
                      Correcte
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Réponse attendue (pour les questions ouvertes) */}
        {isAdmin && question.expectedAnswer && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-sm font-medium text-blue-800">Réponse attendue :</p>
            <p className="text-sm text-blue-700">{question.expectedAnswer}</p>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div>
            <CardTitle>{quiz.title}</CardTitle>
            <CardDescription className="mt-2">
              {quiz.description || 'Quiz personnalisé'}
            </CardDescription>
            
            {isAdmin && (
              <div className="flex space-x-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEmailModalOpen(true)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownloadPDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={onSendToCandidate}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Vue candidat
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <Badge variant="outline" className="px-3 py-1">
              {totalQuestions} questions
            </Badge>
            {quiz.timeLimit && (
              <Badge variant="outline" className="px-3 py-1">
                {quiz.timeLimit} minutes
              </Badge>
            )}
            {quiz.candidateInfo && quiz.candidateInfo.name && (
              <Badge variant="outline" className="px-3 py-1">
                Pour: {quiz.candidateInfo.name}
              </Badge>
            )}
            {quiz.candidateInfo && quiz.candidateInfo.skillMatchPercent && (
              <Badge className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200">
                Match: {quiz.candidateInfo.skillMatchPercent}%
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Navigation entre les sections */}
          <Tabs
            value={`section-${activeSection}`}
            onValueChange={(value) => setActiveSection(parseInt(value.split('-')[1]))}
            className="mb-6"
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
            
            {/* Contenu des sections */}
            {quiz.sections.map((section:Section, index:number) => (
              <TabsContent key={`section-content-${index}`} value={`section-${index}`}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{section.title || `Section ${index + 1}`}</h3>
                  {section.description && (
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  )}
                </div>
                
                <div className="space-y-4">
                  {section.questions.map((question:Question, qIndex:number) => 
                    renderQuestion(question, qIndex)
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          {/* Navigation entre les sections */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
              disabled={activeSection === 0}
            >
              Section précédente
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveSection(Math.min(quiz.sections.length - 1, activeSection + 1))}
              disabled={activeSection === quiz.sections.length - 1}
            >
              Section suivante
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Modal d'envoi par e-mail */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Envoyer le quiz au candidat</DialogTitle>
            <DialogDescription>
              Le candidat recevra un e-mail avec un lien pour accéder au quiz.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSendEmail}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="message" className="text-right">
                  Message
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  placeholder="Message personnalisé (optionnel)"
                  className="col-span-3"
                  rows={4}
                />
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmailModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={sendingEmail || emailSent}
                className={emailSent ? 'bg-green-600' : ''}
              >
                {emailSent ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Envoyé!
                  </>
                ) : sendingEmail ? 'Envoi en cours...' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuizViewer;