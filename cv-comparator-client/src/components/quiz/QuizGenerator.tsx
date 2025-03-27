import React, { useState, FormEvent, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { API_BASE_URL } from '../../services/api';
import MultiInput from '../cv/MultiInput'; // Ajustez le chemin selon votre structure de projet

type ExperienceLevel = 'junior' | 'mid' | 'senior';

interface Requirements {
  jobTitle: string;
  description: string;
  skills: string[];
  tools: string[];
  experienceLevel: ExperienceLevel;
}

interface RecruiterInfo {
  _id: string;
  email: string;
}

interface QuizGeneratorProps {
  onQuizGenerated?: (quiz: any) => void;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onQuizGenerated }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recruiterInfo, setRecruiterInfo] = useState<RecruiterInfo | null>(null);
  
  const [requirements, setRequirements] = useState<Requirements>({
    jobTitle: '',
    description: '',
    skills: [],
    tools: [],
    experienceLevel: 'mid',
  });
  
  // Récupération des informations du recruteur au chargement du composant
  useEffect(() => {
    const fetchRecruiterInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('Aucun token trouvé, impossible de récupérer les informations du recruteur');
          return;
        }
        
        // Récupération des informations utilisateur depuis l'API
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des informations utilisateur');
        }
        
        const userData = await response.json();
        
        setRecruiterInfo({
          _id: userData._id,
          email: userData.email
        });
      } catch (err) {
        console.error('Erreur lors de la récupération des informations recruteur:', err);
        setError('Impossible de récupérer vos informations. Veuillez vous reconnecter.');
      }
    };
    
    fetchRecruiterInfo();
  }, []);
  
  const handleSkillsChange = (newSkills: string[]) => {
    setRequirements({ ...requirements, skills: newSkills });
  };
  
  const handleToolsChange = (newTools: string[]) => {
    setRequirements({ ...requirements, tools: newTools });
  };
  
  const generateQuiz = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Récupération du token depuis le localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Veuillez vous connecter pour générer un quiz');
      }
      
      if (!recruiterInfo) {
        throw new Error('Informations du recruteur non disponibles');
      }
      
      // Préparation des données avec les informations du recruteur
      const quizData = {
        requirements,
        recruiter: {
          _id: recruiterInfo._id,
          email: recruiterInfo.email
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(quizData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la génération du quiz');
      }
      
      setSuccess('Quiz généré avec succès !');
      onQuizGenerated && onQuizGenerated(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    generateQuiz();
  };
  
  return (

    <>
    <h1 className="text-2xl font-bold mb-4 text-white">Génération de Quiz</h1>
    <Card className="w-full shadow-xl border-0 backdrop-blur-sm" style={{ backgroundColor: 'rgba(249, 250, 251, 0.6)' }}>
      <CardHeader>
      <CardTitle>
        
      </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-lg font-medium">Génération du quiz en cours...</p>
              <p className="text-sm text-gray-500 mt-2">Cette opération peut prendre quelques instants</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Titre du poste</Label>
              <Input 
                id="jobTitle" 
                className="text-black"
                style={{ backgroundColor: 'white', color: 'black' }}
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
            <Label htmlFor="description">Description du poste</Label>
            <Textarea 
              id="description" 
              className="text-black bg-white"
              value={requirements.description} 
              onChange={(e) => setRequirements({...requirements, description: e.target.value})}
              placeholder="Détaillez les responsabilités et attentes du poste..."
              rows={4}
              required
            />
          </div>
          
          <MultiInput 
            id="skills"
            label="Compétences requises"
            value={requirements.skills}
            onChange={handleSkillsChange}
            placeholder="ex: React, TypeScript, CSS, Redux"
            required
          />
          
          <MultiInput 
            id="tools"
            label="Outils requis"
            value={requirements.tools}
            onChange={handleToolsChange}
            placeholder="ex: Git, Webpack, Jest, VSCode"
            required
          />
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert variant="default" className="bg-green-50 text-green-800 border border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          {recruiterInfo && (
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-600">
                Quiz généré par: <span className="font-medium">{recruiterInfo.email}</span>
              </p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isLoading || !recruiterInfo}
          >
            {isLoading ? 'Génération en cours...' : 'Générer le Quiz'}
          </Button>
        </form>
      </CardContent>
    </Card>
    </>
  );
};

export default QuizGenerator;