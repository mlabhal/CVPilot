import React, { useState, FormEvent, useRef } from 'react';
import { Upload } from 'lucide-react';
import MultiInput from './MultiInput';
import { API_BASE_URL } from '../../services/api';
import CVResultsPage from './CVResultsPage';
import type { ApiResponse } from '../../types';

const FunCVLoader = React.lazy(() => import('./FunCVLoader'));

interface JobRequirements {
  skills: string[];
  tools: string[];
  experience_years: number;
  education: string[];
  languages: string[];
  description: string; // Nouveau champ
}

function CVUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<ApiResponse | null>(null);

  const [requirements, setRequirements] = useState<JobRequirements>({
    skills: [],
    tools: [],
    experience_years: 0,
    education: [],
    languages: [],
    description: '' // Initialisation du nouveau champ
  });

  const MAX_CV_COUNT = 10; // Constante pour définir la limite

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      
      // Vérification de la limite
      if (selectedFiles.length + filesArray.length > MAX_CV_COUNT) {
        setError(`Vous ne pouvez pas télécharger plus de ${MAX_CV_COUNT} CV à la fois.`);
        return;
      }
      
      setSelectedFiles(prev => [...prev, ...filesArray]);
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files) {
      const filesArray = Array.from(event.dataTransfer.files);
      
      // Vérification de la limite
      if (selectedFiles.length + filesArray.length > MAX_CV_COUNT) {
        setError(`Vous ne pouvez pas télécharger plus de ${MAX_CV_COUNT} CV à la fois.`);
        return;
      }
      
      setSelectedFiles(prev => [...prev, ...filesArray]);
      setError(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prevFiles => 
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const resetForm = () => {
    setResults(null);
    setSelectedFiles([]);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length < 2) {
      setError('Veuillez sélectionner au moins deux CV à comparer');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('requirements', JSON.stringify(requirements));
    selectedFiles.forEach(file => {
      formData.append('cvFiles', file);
    });

    try {
      // Création manuelle des options pour la requête multipart/form-data
      const requestOptions: RequestInit = {
        method: 'POST',
        body: formData,
        // Ne pas définir le Content-Type pour le multipart/form-data
        // Le navigateur le configurera automatiquement avec le bon boundary
      };
      
      // Ajouter le token d'authentification manuellement
      const token = localStorage.getItem('token');
      if (token) {
        requestOptions.headers = {
          'Authorization': `Bearer ${token}`
        };
      }
      
      // Faire la requête directement avec fetch
      const response = await fetch(`${API_BASE_URL}/cv/compare`, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Échec de la comparaison des CVs (${response.status})`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Erreur lors de la comparaison:', err);
    } finally {
      setLoading(false);
    }
  };

  // Si des résultats sont disponibles, afficher le composant de résultats
  if (results) {
    return (
      <div>
        <CVResultsPage 
          apiResponse={results} 
          isFromSearch={false}
          resetForm={resetForm}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-0 ">
      <div className="container mx-auto">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-8">Comparateur des CVs</h1>
            
            <form onSubmit={handleSubmit} className="rounded-lg shadow-xl p-6 border-0 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}>
              {/* Champs des exigences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Champ description - Nouveau */}
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
                {/* Compétences */}
                <MultiInput
                  id="skills"
                  label="Compétences Requises"
                  value={requirements.skills}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    skills: newValue
                  }))}
                  placeholder="Ajoutez vos compétences requises"
                  required
                />

                {/* Outils */}
                <MultiInput
                  id="tools"
                  label="Outils Requis"
                  value={requirements.tools}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    tools: newValue
                  }))}
                  placeholder="Ajoutez vos outils requis"
                  required
                />

                {/* Expérience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="experience">
                    Années d'Expérience Requises *
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

                {/* Formation */}
                <MultiInput
                  id="education"
                  label="Formation Requise"
                  value={requirements.education}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    education: newValue
                  }))}
                  placeholder="Ajoutez les formations requises"
                  required
                />

                {/* Langues */}
                <MultiInput
                  id="languages"
                  label="Langues Requises"
                  value={requirements.languages}
                  onChange={(newValue) => setRequirements(prev => ({
                    ...prev,
                    languages: newValue
                  }))}
                  placeholder="Ajoutez les langues requises"
                  required
                />
              </div>

              {/* Upload des CVs - reste inchangé */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVs à Comparer *
                </label>
                <div
                  onClick={handleUploadClick}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-1">
                    Glissez et déposez vos fichiers CV ici, ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    Formats acceptés : PDF, DOC, DOCX (Max 10MB chacun)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {selectedFiles.length} CV sélectionné{selectedFiles.length > 1 ? 's' : ''} sur {MAX_CV_COUNT} maximum
                      </span>
                      <span className={`text-xs font-medium ${selectedFiles.length === MAX_CV_COUNT ? 'text-amber-600' : 'text-blue-600'}`}>
                        {selectedFiles.length === MAX_CV_COUNT ? 'Limite atteinte' : `${MAX_CV_COUNT - selectedFiles.length} emplacements restants`}
                      </span>
                    </div>
                    
                    {/* Barre de progression */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                      <div 
                        className={`h-2.5 rounded-full ${
                          selectedFiles.length === MAX_CV_COUNT 
                            ? 'bg-amber-500' 
                            : selectedFiles.length > MAX_CV_COUNT * 0.7 
                              ? 'bg-amber-400' 
                              : 'bg-blue-600'
                        }`} 
                        style={{ width: `${Math.min(100, (selectedFiles.length / MAX_CV_COUNT) * 100)}%` }}
                      ></div>
                    </div>
                    
                    {/* Liste des fichiers */}
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || selectedFiles.length < 2}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Analyse en cours...' : 'Comparer les CVs'}
              </button>

              {/* Loader en overlay centré */}
              {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-4 shadow-2xl max-w-md w-full mx-4">
                    <React.Suspense fallback={
                      <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Chargement...</p>
                      </div>
                    }>
                      <FunCVLoader />
                    </React.Suspense>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>    
    );
  }

export default CVUpload;