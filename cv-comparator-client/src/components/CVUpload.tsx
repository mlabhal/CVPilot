import React, { useState, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import MultiInput from './MultiInput';

interface JobRequirements {
  skills: string[];
  tools: string[];
  experience_years: number;
  education: string[];
  languages: string[];
  description: string; // Nouveau champ
}

function CVUpload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requirements, setRequirements] = useState<JobRequirements>({
    skills: [],
    tools: [],
    experience_years: 0,
    education: [],
    languages: [],
    description: '' // Initialisation du nouveau champ
  });

  // ... [Tous vos handlers restent les mêmes]
  const handleArrayInput = (field: keyof JobRequirements, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item !== '');
    setRequirements(prev => ({
      ...prev,
      [field]: items
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(filesArray);
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
      setSelectedFiles(filesArray);
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
      const response = await fetch('http://localhost:3000/api/cv/compare', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Échec de la comparaison des CVs');
      }

      const data = await response.json();

      navigate('/results', { 
        state: { 
          analysisResults: data,
          requirements: requirements // On passe aussi les requirements si besoin
        } 
      });      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setRequirements({
      skills: [],
      tools: [],
      experience_years: 0,
      education: [],
      languages: [],
      description: '' // Réinitialisation du nouveau champ
    });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Analyseur de CV</h1>
            
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
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
                  <div className="mt-4 space-y-2">
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

              {loading && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Analyse des CVs en cours...</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>    
    );
  }

export default CVUpload;