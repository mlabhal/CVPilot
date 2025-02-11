// src/components/CVSearch.tsx
import React, { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';
import CVAnalysisViewer from './CVAnalysisViewer';
import type { ComparisonResults } from '../types';

interface JobRequirements {
  skills: string[];
  tools: string[];
  experience_years: number;
  education: string[];
  languages: string[];
}

const CVSearch: React.FC = () => {
  const [results, setResults] = useState<ComparisonResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requirements, setRequirements] = useState<JobRequirements>({
    skills: [],
    tools: [],
    experience_years: 0,
    education: [],
    languages: []
  });

  const handleArrayInput = (field: keyof JobRequirements, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item !== '');
    setRequirements(prev => ({
      ...prev,
      [field]: items
    }));
  };
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
      languages: []
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
                {/* Compétences */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="skills">
                    Compétences Recherchées
                  </label>
                  <input
                    type="text"
                    id="skills"
                    value={requirements.skills.join(', ')}
                    onChange={(e) => handleArrayInput('skills', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Séparez les compétences par des virgules"
                  />
                </div>

                {/* Outils */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="tools">
                    Outils Recherchés
                  </label>
                  <input
                    type="text"
                    id="tools"
                    value={requirements.tools.join(', ')}
                    onChange={(e) => handleArrayInput('tools', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Séparez les outils par des virgules"
                  />
                </div>

                {/* Expérience */}
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
                  />
                </div>

                {/* Formation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="education">
                    Formation Recherchée
                  </label>
                  <input
                    type="text"
                    id="education"
                    value={requirements.education.join(', ')}
                    onChange={(e) => handleArrayInput('education', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Séparez les formations par des virgules"
                  />
                </div>

                {/* Langues */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="languages">
                    Langues Recherchées
                  </label>
                  <input
                    type="text"
                    id="languages"
                    value={requirements.languages.join(', ')}
                    onChange={(e) => handleArrayInput('languages', e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Séparez les langues par des virgules"
                  />
                </div>
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
                <div className="flex justify-between items-center mb-4">
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

    <div className="container mx-auto px-4 py-6">
      <div className="space-y-8">
        {results.rankings.map((candidate, index) => (
          <div key={index}>
            <CVAnalysisViewer
              analysisResult={{
                name: candidate.name,
                isTopCandidate: index === 0,
                skills: candidate.skills || [],
                tools: candidate.tools || [],
                experience_years: candidate.experience_years || 0,
                education: candidate.education || [],
                languages: candidate.languages || [],
                score: {
                  totalScore: candidate.similarity_score * 100,
                  detailedScores: candidate.detailed_scores || {
                    skills: 0,
                    tools: 0,
                    experience_years: 0,
                    education: 0,
                    languages: 0
                  }
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
};

export default CVSearch;