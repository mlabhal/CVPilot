import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { API_BASE_URL } from '../../services/api';

type ExperienceLevel = 'junior' | 'mid' | 'senior';

interface Requirements {
  jobTitle: string;
  description: string;
  skills: string[];
  tools: string[];
  experienceLevel: ExperienceLevel;
}

interface QuizGeneratorProps {
  onQuizGenerated?: (quiz: any) => void;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ onQuizGenerated }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [requirements, setRequirements] = useState<Requirements>({
    jobTitle: '',
    description: '',
    skills: [],
    tools: [],
    experienceLevel: 'mid',
  });
  
  const handleSkillsChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const skillsString = e.target.value;
    const skillsArray = skillsString.split(',').map(skill => skill.trim()).filter(Boolean);
    setRequirements({ ...requirements, skills: skillsArray });
  };
  
  const handleToolsChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const toolsString = e.target.value;
    const toolsArray = toolsString.split(',').map(tool => tool.trim()).filter(Boolean);
    setRequirements({ ...requirements, tools: toolsArray });
  };
  
  const generateQuiz = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
        // Récupération du token depuis le localStorage ou autre système de gestion d'état
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Veuillez vous connecter pour générer un quiz');
      }
      const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ requirements }),
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Génération de Quiz</CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Label htmlFor="description">Description du poste</Label>
            <Textarea 
              id="description" 
              value={requirements.description} 
              onChange={(e) => setRequirements({...requirements, description: e.target.value})}
              placeholder="Détaillez les responsabilités et attentes du poste..."
              rows={4}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="skills">Compétences requises (séparées par des virgules)</Label>
            <Textarea 
              id="skills" 
              value={requirements.skills.join(', ')} 
              onChange={handleSkillsChange}
              placeholder="ex: React, TypeScript, CSS, Redux"
              rows={2}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tools">Outils requis (séparés par des virgules)</Label>
            <Textarea 
              id="tools" 
              value={requirements.tools.join(', ')} 
              onChange={handleToolsChange}
              placeholder="ex: Git, Webpack, Jest, VSCode"
              rows={2}
              required
            />
          </div>
          
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
          
          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Génération en cours...' : 'Générer le Quiz'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuizGenerator;