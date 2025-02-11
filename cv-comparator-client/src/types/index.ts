// Types existants
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Channel {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  subscribers: User[];
}

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

// Types pour l'analyse des CV
export interface DetailedScores {
  skills: number;
  tools: number;
  experience: number;
  education: number;
  languages: number;
  description_relevance?: number;
}

export interface DescriptionMatch {
  score: number;
  relevant_experiences: string[];
  keyword_matches: string[];
}

export interface Candidate {
  candidate_id: string;
  name: string;
  status: string;
  similarity_score: number;
  similarity_to_job: number;
  description_match?: DescriptionMatch;
  skill_match_percent: number;
  matching_skills: string[];
  matching_tools: string[];
  experience_years:number;
  education:string[];
  languages:string[];
  experience_match: number;
  education_match: number;
  language_match: number;
  detailed_scores: DetailedScores;
}

export interface AIAnalysisSummary {
  top_candidate: string;
  comparative_analysis: string;
  description_analysis?: string;
  hiring_recommendations: string[];
}

export interface ComparisonResults {
  rankings: Candidate[];
  ai_analysis: {
    summary: AIAnalysisSummary;
  };
  errors?: APIError[];
}

export interface APIError {
  file?: string;
  error: string;
  message?: string;
  stack?: string;
}

// Pour les props du composant CVResultsPage
export interface CVResultsPageProps {
  apiResponse: ComparisonResults;
}

// Props pour le composant CVAnalysisViewer
export interface CVAnalysisViewerProps {
  analysisResult: Candidate;
  globalSummary: AIAnalysisSummary;
}