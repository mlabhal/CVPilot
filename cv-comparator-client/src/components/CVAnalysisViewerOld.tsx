import React from 'react';
import { Trophy } from 'lucide-react';

interface AnalysisResult {
  skills: string[];
  tools: string[];
  experience_years: number;
  education: string[];
  languages: string[];
  score?: {
    totalScore: number;
    detailedScores: {
      skills: number;
      tools: number;
      experience_years: number;
      education: number;
      languages: number;
    };
  };
  isTopCandidate?: boolean;
  name: string;
}

interface CVAnalysisViewerProps {
  analysisResult: AnalysisResult;
}

const Card: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
    {children}
  </div>
);

const CVAnalysisViewer: React.FC<CVAnalysisViewerProps> = ({ analysisResult }) => {
  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const sections = [
    {
      title: 'Expérience Professionnelle',
      icon: '⏱️',
      content: `${analysisResult.experience_years} années`,
      score: analysisResult.score?.detailedScores.experience_years,
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Compétences Techniques',
      icon: '💻',
      content: analysisResult.skills,
      score: analysisResult.score?.detailedScores.skills,
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Outils & Technologies',
      icon: '🔧',
      content: analysisResult.tools,
      score: analysisResult.score?.detailedScores.tools,
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Formation',
      icon: '🎓',
      content: analysisResult.education,
      score: analysisResult.score?.detailedScores.education,
      bgColor: 'bg-pink-50'
    },
    {
      title: 'Langues',
      icon: '🌐',
      content: analysisResult.languages,
      score: analysisResult.score?.detailedScores.languages,
      bgColor: 'bg-teal-50'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête avec nom et trophée */}
      <div className="flex items-center gap-3 mb-6">
        {analysisResult.isTopCandidate && (
          <Trophy className="h-6 w-6 text-yellow-500" />
        )}
        <h2 className="text-2xl font-bold text-gray-800">{analysisResult.name}</h2>
      </div>

      {/* Score Global */}
      {analysisResult.score && (
        <Card className="mb-8">
          <div className="relative h-24 bg-gradient-to-r from-blue-500 to-purple-600 p-6">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative flex justify-between items-center">
              <div className="text-white">
                <div className="text-xl font-bold mb-1">Score Global</div>
                <div className="text-sm opacity-80">Performance globale du profil</div>
              </div>
              <div className={`text-3xl font-bold px-4 py-2 rounded-lg bg-white text-blue-600`}>
                {formatPercentage(analysisResult.score.totalScore)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Sections en horizontal */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {sections.map((section, index) => (
          <Card key={index} className={section.bgColor}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{section.icon}</span>
                  <h3 className="font-semibold text-gray-800">{section.title}</h3>
                </div>
              </div>

              {section.score && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-1 rounded-md text-sm font-medium ${getScoreColor(section.score)}`}>
                      {formatPercentage(section.score)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${getProgressBarColor(section.score)}`}
                      style={{ width: `${section.score}%` }}
                    ></div>
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
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CVAnalysisViewer;