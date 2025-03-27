// Types pour les utilisateurs
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  type: 'candidat' | 'recruteur';
  companyName?:string;
}
// Types pour les canaux
export interface Channel {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  subscribers: User[];
}

// Types pour les publications
export interface Post {
  _id: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
  };
  likes: string[];
  comments: {
    _id: string;
    content: string;
    author: {
      name: string;
      avatar?: string;
    };
    createdAt: Date;
  }[];
  tags: string[];
  createdAt: Date;
  channel: Channel;
  updatedAt?: Date;
}

// Types détaillés pour l'analyse des scores
export interface DetailedScores {
  skills: number;
  tools: number;
  experience: number;
  education: number;
  languages: number;
  description_relevance?: number;
}

// Type pour les correspondances de description
export interface DescriptionMatch {
  score: number;
  relevant_experiences: string[];
  keyword_matches: string[];
}


export interface Experience {
  title: string;
  company: string;
  description: string;
  duration: string;
  duration_in_months: number;
}
export interface Projects {
  name: string;
  description: string;
  technologies: string[];
}
export interface Candidate {
  candidate_id: string;
  fileName :string;
  name: string;
  phone_number:string;
  email:string;
  summary?:string;
  status: string;
  skills: string[];
  tools: string[];
  experience_years: number;
  education: string[];
  languages: string[];
  experiences: Experience[];
  projects?:Projects[];
  matching_skills: string[];
  matching_tools: string[];
  totalScore: number;
  skill_match_percent: number;
  tool_match_percent:number;
  description_match_score: number;
}

export interface ApiResponse {
  rankings: Candidate[];
}

export interface CVResultsPageProps {
  apiResponse: ApiResponse;
  isFromSearch?: boolean;
  resetForm?: () => void;
}


// Interface pour le résumé de l'analyse IA
export interface AIAnalysisSummary {
  top_candidate: string;
  comparative_analysis: string;
  description_analysis?: string;
  hiring_recommendations: string[];
}

// Interface pour les résultats de comparaison
export interface ComparisonResults {
  rankings: Candidate[];
  ai_analysis: {
    summary: AIAnalysisSummary;
  };
  errors?: APIError[];
}

// Interface pour les erreurs d'API
export interface APIError {
  file?: string;
  error: string;
  message?: string;
  stack?: string;
}

// Props pour le composant CVResultsPage
export interface CVResultsPageProps {
  rankings?: Candidate[];
}
// Props pour le composant CVAnalysisViewer
export interface CVAnalysisViewerProps {
  analysisResult: Candidate & {
    score?: {
      totalScore: number;
      detailedScores: {
        skills: number;
        tools: number;
        experience: number;
        education: number;
        languages: number;
        description_relevance?: number;
      };
    };
    isTopCandidate?: boolean;
  };
  globalSummary: AIAnalysisSummary;
}