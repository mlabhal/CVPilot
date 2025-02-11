import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import CVAnalysisViewer from './CVAnalysisViewer';
import { CVResultsPageProps } from '../types';

const CVResultsPage: React.FC<CVResultsPageProps> = ({ apiResponse }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(0);

  if (!apiResponse?.rankings || apiResponse.rankings.length === 0) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-500">Aucun résultat d'analyse disponible</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Analyse des CV</h1>
      
      {/* Résumé global */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Résumé de l'analyse</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Meilleur candidat :</span>{' '}
            {apiResponse.ai_analysis.summary.top_candidate}
          </p>
          <p>
            <span className="font-medium">Analyse comparative :</span>{' '}
            {apiResponse.ai_analysis.summary.comparative_analysis}
          </p>
          {apiResponse.ai_analysis.summary.description_analysis && (
            <p>
              <span className="font-medium">Analyse de la description :</span>{' '}
              {apiResponse.ai_analysis.summary.description_analysis}
            </p>
          )}
          {apiResponse.ai_analysis.summary.hiring_recommendations && (
            <div>
              <span className="font-medium">Recommandations :</span>
              <ul className="list-disc list-inside ml-4 mt-2">
                {apiResponse.ai_analysis.summary.hiring_recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Onglets pour chaque candidat */}
      <Tabs
        defaultValue={apiResponse.rankings[0].name}
        className="w-full"
      >
        <TabsList className="mb-6 inline-flex flex-wrap bg-gray-100 rounded-lg w-full h-auto relative">
          {apiResponse.rankings.map((candidate, index) => (
            <TabsTrigger
              key={candidate.name}
              value={candidate.name}
              onClick={() => setSelectedCandidate(index)}
              className="m-1 px-6 py-3 text-base font-medium rounded-md transition-all duration-200 
                relative whitespace-nowrap flex items-center justify-center
                data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm
                data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900
                data-[state=inactive]:hover:bg-white/50"
            >
              {candidate.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {apiResponse.rankings.map((candidate) => (
          <TabsContent key={candidate.name} value={candidate.name} className="mt-6">
            <CVAnalysisViewer
              analysisResult={candidate}
              globalSummary={apiResponse.ai_analysis.summary}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Affichage des erreurs si présentes */}
      {apiResponse.errors && apiResponse.errors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 rounded-lg">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Erreurs détectées</h3>
          <ul className="list-disc list-inside text-red-600">
            {apiResponse.errors.map((error, index) => (
              <li key={index}>{error.message || error.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CVResultsPage;