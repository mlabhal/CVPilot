// components/quiz/QuizGenerator.tsx
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, FileText, CheckCircle, Users } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { QuizGeneratorProps, QuizData, QuizSummary, Requirements, ExperienceLevel } from '@/types/quiz';
import { API_BASE_URL } from '../../services/api';

type GenerationMethod = 'fromCV' | 'fromIndexedCV' | 'forTopCandidates';

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onQuizGenerated }) => {
  // États pour gérer les différentes méthodes de génération
  const [activeTab, setActiveTab] = useState<GenerationMethod>('fromCV');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // États pour les formulaires
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [requirements, setRequirements] = useState<Requirements>({
    jobTitle: '',
    jobDescription: '',
    requiredSkills: [],
    requiredTools: [],
    experienceLevel: 'mid',
  });
  const [candidateId, setCandidateId] = useState<string>('');
  const [topCandidatesLimit, setTopCandidatesLimit] = useState<number>(5);
  
  // Conversion des skills/tools de chaîne à tableau
  const handleSkillsChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const skillsString = e.target.value;
    const skillsArray = skillsString.split(',').map(skill => skill.trim()).filter(Boolean);
    setRequirements({ ...requirements, requiredSkills: skillsArray });
  };
  
  const handleToolsChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const toolsString = e.target.value;
    const toolsArray = toolsString.split(',').map(tool => tool.trim()).filter(Boolean);
    setRequirements({ ...requirements, requiredTools: toolsArray });
  };
  
  // Gestionnaire pour l'upload de fichier
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // API calls
  const generateQuizFromCV = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const formData = new FormData();
      if (!selectedFile) {
        throw new Error("Aucun fichier CV sélectionné");
      }
      
      formData.append('cv', selectedFile);
      formData.append('requirements', JSON.stringify(requirements));
      
      const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la génération du quiz');
      }
      
      setSuccess('Quiz généré avec succès!');
      onQuizGenerated && onQuizGenerated(result.data as QuizSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateQuizFromIndexedCV = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/quiz/generate/indexed/${candidateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirements }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la génération du quiz');
      }
      
      setSuccess('Quiz généré avec succès!');
      onQuizGenerated && onQuizGenerated(result.data as QuizSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateQuizzesForTopCandidates = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/quiz/generate/top-candidates?limit=${topCandidatesLimit}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirements }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la génération des quiz');
      }
      
      setSuccess(`${result.summary.successful} quiz générés pour les meilleurs candidats!`);
      
      // Pour la simplicité, on utilisera le premier quiz réussi comme quiz sélectionné
      const firstSuccessfulQuiz = result.results.find((r: any) => r.success);
      if (firstSuccessfulQuiz) {
        // Fetch le quiz complet
        const quizResponse = await fetch(`${API_BASE_URL}/quiz/${firstSuccessfulQuiz.quizId}`);
        const quizResult = await quizResponse.json();
        if (quizResponse.ok) {
          onQuizGenerated && onQuizGenerated(quizResult.data as QuizData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    switch (activeTab) {
      case 'fromCV':
        if (!selectedFile) {
          setError('Veuillez sélectionner un fichier CV');
          return;
        }
        generateQuizFromCV();
        break;
      case 'fromIndexedCV':
        if (!candidateId) {
          setError('Veuillez saisir l\'ID du candidat');
          return;
        }
        generateQuizFromIndexedCV();
        break;
      case 'forTopCandidates':
        generateQuizzesForTopCandidates();
        break;
      default:
        setError('Mode de génération non reconnu');
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Génération de Quiz</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GenerationMethod)}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="fromCV">
              <FileText className="mr-2 h-4 w-4" />
              À partir d'un CV
            </TabsTrigger>
            <TabsTrigger value="fromIndexedCV">
              <CheckCircle className="mr-2 h-4 w-4" />
              CV indexé
            </TabsTrigger>
            <TabsTrigger value="forTopCandidates">
              <Users className="mr-2 h-4 w-4" />
              Meilleurs candidats
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            {/* Formulaire des requirements commun à tous les modes */}
            <div className="space-y-4 mb-6">
              <h3 className="text-md font-semibold">Requirements du poste</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Titre du poste</Label>
                  <Input 
                    id="jobTitle" 
                    value={requirements.jobTitle} 
                    onChange={(e) => setRequirements({...requirements, jobTitle: e.target.value})}
                    placeholder="ex: Développeur Frontend React"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Niveau d'expérience</Label>
                  <select 
                    id="experienceLevel"
                    className="w-full p-2 border rounded-md"
                    value={requirements.experienceLevel}
                    onChange={(e) => setRequirements({
                      ...requirements, 
                      experienceLevel: e.target.value as ExperienceLevel
                    })}
                  >
                    <option value="junior">Junior (0-2 ans)</option>
                    <option value="mid">Intermédiaire (2-5 ans)</option>
                    <option value="senior">Senior (5+ ans)</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Description du poste</Label>
                <Textarea 
                  id="jobDescription" 
                  value={requirements.jobDescription} 
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRequirements({...requirements, jobDescription: e.target.value})}
                  placeholder="Détaillez les responsabilités et attentes du poste..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requiredSkills">Compétences requises (séparées par des virgules)</Label>
                <Textarea 
                  id="requiredSkills" 
                  value={requirements.requiredSkills.join(', ')} 
                  onChange={handleSkillsChange}
                  placeholder="ex: React, TypeScript, CSS, Redux"
                  rows={2}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requiredTools">Outils requis (séparés par des virgules)</Label>
                <Textarea 
                  id="requiredTools" 
                  value={requirements.requiredTools.join(', ')} 
                  onChange={handleToolsChange}
                  placeholder="ex: Git, Webpack, Jest, VSCode"
                  rows={2}
                />
              </div>
            </div>
            
            {/* Options spécifiques à chaque mode */}
            <TabsContent value="fromCV" className="p-4 border rounded-md">
              <div className="space-y-4">
                <Label htmlFor="cvFile">Sélectionner un CV (PDF, DOC, DOCX)</Label>
                <Input 
                  id="cvFile" 
                  type="file" 
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="fromIndexedCV" className="p-4 border rounded-md">
              <div className="space-y-4">
                <Label htmlFor="candidateId">ID du candidat</Label>
                <Input 
                  id="candidateId" 
                  value={candidateId} 
                  onChange={(e) => setCandidateId(e.target.value)}
                  placeholder="ex: 60d21b4667d0d8992e610c85"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="forTopCandidates" className="p-4 border rounded-md">
              <div className="space-y-4">
                <Label htmlFor="topCandidatesLimit">Nombre de candidats</Label>
                <Input 
                  id="topCandidatesLimit" 
                  type="number"
                  min="1"
                  max="10"
                  value={topCandidatesLimit.toString()} 
                  onChange={(e) => setTopCandidatesLimit(parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500">Maximum: 10 candidats</p>
              </div>
            </TabsContent>
            
            {/* Affichage des messages d'erreur/succès */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert variant="default" className="mt-4 bg-green-50 text-green-800 border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            {/* Bouton de soumission */}
            <div className="mt-6">
              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Génération en cours...' : 'Générer le Quiz'}
              </Button>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QuizGenerator;