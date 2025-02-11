import React from 'react';
import { Trophy, ArrowUpDown, Briefcase, GraduationCap, Languages } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { CVAnalysisViewerProps } from '../types/index';

const CVAnalysisViewer: React.FC<CVAnalysisViewerProps> = ({ 
  analysisResult, 
  globalSummary 
}) => {
  const formatScore = (score: number) => {
    // Divise le score par 100 pour les valeurs supérieures à 100
    const normalizedScore = score > 100 ? score / 100 : score;
    return `${normalizedScore.toFixed(1)}%`;
  };

  const normalizeScore = (score: number): number => {
    return score > 100 ? score / 100 : score;
  };

  const getScoreColor = (score: number) => {
    const normalizedScore = normalizeScore(score);
    if (normalizedScore >= 0.8) return 'bg-green-100 text-green-800';
    if (normalizedScore >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getProgressBarColor = (score: number) => {
    const normalizedScore = normalizeScore(score);
    if (normalizedScore >= 0.8) return 'bg-green-500';
    if (normalizedScore >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Sections principales du profil
  const sections = [
    {
      title: 'Expérience Professionnelle',
      icon: <Briefcase className="h-5 w-5" />,
      content: `${analysisResult.experience_years} années`,
      score: analysisResult.detailed_scores.experience,
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Compétences Techniques',
      icon: <Trophy className="h-5 w-5" />,
      content: analysisResult.matching_skills,
      score: analysisResult.detailed_scores.skills,
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Outils & Technologies',
      icon: <ArrowUpDown className="h-5 w-5" />,
      content: analysisResult.matching_tools,
      score: analysisResult.detailed_scores.tools,
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Formation',
      icon: <GraduationCap className="h-5 w-5" />,
      score: analysisResult.detailed_scores.education,
      content: analysisResult.education,
      bgColor: 'bg-pink-50'
    },
    {
      title: 'Langues',
      icon: <Languages className="h-5 w-5" />,
      score: analysisResult.detailed_scores.languages,
      content: analysisResult.languages,
      bgColor: 'bg-teal-50'
    }
  ];

  return (
    <div className="space-y-8 p-6">
      {/* En-tête avec nom et scores globaux */}
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              {analysisResult.similarity_score >= 0.8 && (
                <Trophy className="h-6 w-6 text-yellow-500" />
              )}
              <div>
                <CardTitle className="text-2xl">{analysisResult.name}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Score Global</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatScore(analysisResult.similarity_score * 100)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Correspondance Poste</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatScore(analysisResult.similarity_to_job * 100)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
  
        {/* Description Match Card */}
        {analysisResult.description_match && (
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Correspondance Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-500">Score</span>
                    <span className={`px-2 py-1 rounded-md text-sm font-medium ${
                      getScoreColor(analysisResult.description_match.score * 100)
                    }`}>
                      {formatScore(analysisResult.description_match.score * 100)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        getProgressBarColor(analysisResult.description_match.score * 100)
                      }`}
                      style={{ width: `${analysisResult.description_match.score * 100}%` }}
                    />
                  </div>
                </div>
                {analysisResult.description_match.relevant_experiences && 
                 analysisResult.description_match.relevant_experiences.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Expériences Pertinentes
                    </p>
                    <div className="space-y-1">
                      {analysisResult.description_match.relevant_experiences.map((exp, i) => (
                        <p key={i} className="text-sm text-gray-600">{exp}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  
      {/* Sections principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {sections.map((section, index) => (
          <Card key={index} className={section.bgColor}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                {section.icon}
                <h3 className="font-semibold text-gray-800">{section.title}</h3>
              </div>
  
              {section.score !== undefined && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-1 rounded-md text-sm font-medium ${
                      getScoreColor(section.score)
                    }`}>
                      {formatScore(section.score)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${getProgressBarColor(section.score)}`}
                      style={{ width: `${normalizeScore(section.score)}%` }}
                    />
                  </div>
                </div>
              )}
  
              <div className="space-y-2">
                {Array.isArray(section.content) ? (
                  <div className="flex flex-wrap gap-2">
                    {section.content.map((item, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white bg-opacity-50 rounded-full text-sm text-gray-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-700">
                    {section.content}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
  
      {/* Résumé global */}
      {globalSummary && globalSummary.hiring_recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>Recommandations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {globalSummary.hiring_recommendations.map((rec, index) => (
                <Alert key={index}>
                  <AlertTitle>Recommandation {index + 1}</AlertTitle>
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CVAnalysisViewer;