import React, { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';
import MultiInput from './MultiInput';
import CVResultsPage from './CVResultsPage';
import type { ApiResponse } from '../types';

interface JobRequirements {
  skills: string[];
  tools: string[];
  experience_years: number;
  education: string[];
  languages: string[];
  description: string;
}

const CVSearch: React.FC = () => {
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requirements, setRequirements] = useState<JobRequirements>({
    skills: [],
    tools: [],
    experience_years: 0,
    education: [],
    languages: [],
    description: ''
  });

  const API_URL = import.meta.env.VITE_API_URL ;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/cv/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirements })
      });

      if (!response.ok) {
        throw new Error('Échec de la recherche des CVs');
      }

      const data = await response.json();
      console.log('Données reçues de l\'API:', data);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResults(null);
    setRequirements({
      skills: [],
      tools: [],
      experience_years: 0,
      education: [],
      languages: [],
      description: ''
    });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto">
        {!results ? (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Recherche dans les CVs</h1>
            
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="description">
                    Description du poste
                  </label>
                  <textarea
                    id="description"
                    value={requirements.description}
                    onChange={(e) => setRequirements(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                    placeholder="Décrivez le poste et ses exigences spécifiques..."
                  />
                </div>
  
                <MultiInput
                  id="skills"
                  label="Compétences Recherchées"
                  value={requirements.skills}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    skills: newValue
                  }))}
                  placeholder="Ajoutez vos compétences recherchées"
                  required
                />
  
                <MultiInput
                  id="tools"
                  label="Outils Recherchés"
                  value={requirements.tools}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    tools: newValue
                  }))}
                  placeholder="Ajoutez vos outils recherchés"
                  required
                />
  
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="experience">
                    Années d'Expérience Minimum
                  </label>
                  <input
                    type="number"
                    id="experience"
                    value={requirements.experience_years}
                    onChange={(e) => setRequirements(prev => ({
                      ...prev,
                      experience_years: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
  
                <MultiInput
                  id="education"
                  label="Formation Recherchée"
                  value={requirements.education}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    education: newValue
                  }))}
                  placeholder="Ajoutez les formations recherchées"
                  required
                />
  
                <MultiInput
                  id="languages"
                  label="Langues Recherchées"
                  value={requirements.languages}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    languages: newValue
                  }))}
                  placeholder="Ajoutez les langues recherchées"
                  required
                />
              </div>
  
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
  
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Search className="h-5 w-5" />
                {loading ? 'Recherche en cours...' : 'Rechercher'}
              </button>
  
              {loading && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Recherche des CVs en cours...</p>
                </div>
              )}
            </form>
          </div>
        ) : (
          <div>
            <div className="bg-white shadow-sm border-b">
              <div className="container mx-auto px-4 py-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-xl font-semibold">Résultats de la Recherche</h1>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Nouvelle Recherche
                  </button>
                </div>
              </div>
            </div>
  
            <CVResultsPage apiResponse={results} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CVSearch;