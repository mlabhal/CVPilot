import React from 'react';
import { Card, CardContent} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FolderKanban, Briefcase, GraduationCap, Wrench, Brain, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
import { Candidate, CVResultsPageProps} from '../types';



const CandidateDetails: React.FC<{ candidate: Candidate }> = ({ candidate }) => {
    const formatDuration = (months: number): string => {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (years > 0 && remainingMonths > 0) {
        return `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois`;
      } else if (years > 0) {
        return `${years} an${years > 1 ? 's' : ''}`;
      }
      return `${remainingMonths} mois`;
    };
  
    return (
        <Card className="w-full bg-white shadow-sm">
          {/* ... (CardHeader reste identique) */}
    
          <CardContent className="p-6">
            <div className="space-y-8">
              {/* Résumé de l'analyse */}
              {/* Résumé de l'analyse */}
              {typeof candidate.summary === 'string' && candidate.summary.trim() !== "" && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <ClipboardCheck className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Résumé de l'analyse</h3>
                  </div>
                  <div className="prose prose-zinc">
                    <p className="text-zinc-600">{candidate.summary}</p>
                  </div>
                </section>
              )}
              {/* Expérience */}
              {candidate.experiences && candidate.experiences.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <Briefcase className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Expérience Professionnelle</h3>
                  </div>
                  <div className="space-y-6">
                    {candidate.experiences.map((exp, i) => (
                      <div key={i} className="relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-indigo-300 before:to-indigo-100">
                        <div className="font-medium text-zinc-800">{exp.title}</div>
                        <div className="text-sm text-indigo-600">{exp.company}</div>
                        <div className="text-sm text-zinc-500">
                          {exp.duration} • {formatDuration(exp.duration_in_months)}
                        </div>
                        <div className="mt-2 text-sm text-zinc-600">{exp.description}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* Projets */}
              {candidate.projects && candidate.projects.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                  <FolderKanban className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-lg text-zinc-800">Projets Professionnels</h3>
                </div>
                <div className="space-y-6">
                  {candidate.projects.map((project, i) => (
                    <div 
                      key={i} 
                      className="relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-indigo-300 before:to-indigo-100"
                    >
                      {/* En-tête du projet avec nom */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                        <div className="font-medium text-lg text-zinc-800">{project.name}</div>
                      </div>
                      
                      {/* Description du projet dans un cadre légèrement mis en valeur */}
                      <div className="mt-2 p-3 bg-zinc-50 rounded-md border border-zinc-100">
                        <div className="text-sm text-zinc-600 leading-relaxed">{project.description}</div>
                      </div>
                      
                      {/* Technologies utilisées avec un titre */}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium uppercase text-zinc-500">Technologies utilisées</div>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech, index) => (
                              <span 
                                key={index}
                                className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
              {/* Compétences et Outils - Maintenant en flex-col */}
              <div className="flex flex-col space-y-8">
                {/* Compétences */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <Brain className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Compétences</h3>
                  </div>
                  
                  {candidate.matching_skills && candidate.matching_skills.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-500">Correspondantes</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.matching_skills.map((skill, i) => (
                          <Badge key={i} className="bg-blue-50 text-indigo-500 border border-indigo-500">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
    
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-500">Autres</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, i) => (
                          <Badge key={i} className="bg-zinc-50 text-zinc-600 border border-zinc-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
    
                {/* Outils */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <Wrench className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Outils</h3>
                  </div>
    
                  {candidate.matching_tools && candidate.matching_tools.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-500">Correspondants</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.matching_tools.map((tool, i) => (
                          <Badge key={i} className="bg-blue-50 text-indigo-500 border border-indigo-500">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
    
                  {candidate.tools && candidate.tools.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-500">Autres</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.tools.map((tool, i) => (
                          <Badge key={i} className="bg-zinc-50 text-zinc-600 border border-zinc-200">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
    
              {/* Formation */}
              {candidate.education && candidate.education.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <GraduationCap className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Formation</h3>
                  </div>
                  <ul className="space-y-2">
                    {candidate.education.map((edu, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-zinc-600">{edu}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </CardContent>
        </Card>
      );
    };
const CVResultsPage: React.FC<CVResultsPageProps> = ({ apiResponse }) => {
  // Fonction utilitaire pour générer un ID sûr
  const generateSafeId = (candidate: Candidate, index: number): string => {
    if (candidate.fileName && typeof candidate.fileName === 'string') {
      return candidate.fileName.replace(/\.[^/.]+$/, "").replace(/\s+/g, '-').toLowerCase();
    }
    return `candidate-${index}`;
  };

  // Fonction pour obtenir le nom d'affichage
  const getDisplayName = (candidate: Candidate, index: number): string => {
    if (!candidate.fileName || typeof candidate.fileName !== 'string') {
      return `Candidat ${index + 1}`;
    }
    return candidate.fileName.split('.')[0];
  };

  // Ajout de console.log pour déboguer
  console.log('apiResponse:', apiResponse);
  console.log('rankings before mapping:', apiResponse?.rankings);

  const rankings = [...(apiResponse?.rankings || [])].map((candidate, index) => {
    // Log pour voir chaque candidat
    console.log('Processing candidate:', candidate);
    
    return {
      ...candidate,
      candidate_id: generateSafeId(candidate, index),
      displayName: getDisplayName(candidate, index)
    };
  }).sort((a, b) => 
    (b.skill_match_percent + b.similarity_score * 100) - (a.skill_match_percent + a.similarity_score * 100)
  );

  // Log des rankings après transformation
  console.log('rankings after mapping:', rankings);

  if (!rankings || rankings.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="w-full p-6 text-center">
          <CardContent>
            <p className="text-lg text-gray-500">Aucun résultat trouvé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Résultats de l'Analyse des CV</h1>
      
      <Tabs defaultValue={rankings[0].candidate_id} className="w-full">
        <div className="relative">
          <div className="border rounded-lg mb-4 bg-muted/20 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full rounded-none rounded-l-lg bg-muted/50 hover:bg-muted/90"
              onClick={() => {
                const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
                if (viewport) {
                  viewport.scrollLeft -= 200;
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <ScrollArea className="w-full h-20">
              <div className="p-2 min-w-full">
                <TabsList className="inline-flex w-max space-x-2 bg-transparent px-8">
                  {rankings.map((candidate, index) => (
                    <TabsTrigger 
                      key={candidate.candidate_id} 
                      value={candidate.candidate_id}
                      className="flex-shrink-0 flex items-center gap-4 bg-white text-zinc-700 shadow-sm hover:bg-blue-100 px-4 py-3 rounded-md data-[state=active]:bg-indigo-50"
                    >
                      <div className="flex flex-col">
                        <div className="text-base font-semibold">
                          {index + 1}. {candidate.displayName}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="default" className="whitespace-nowrap bg-white border text-indigo-500 border-white">
                            Skills Match: {candidate.skill_match_percent}%
                          </Badge>
                          <Badge variant="default" className="whitespace-nowrap bg-white text-indigo-500 border border-white">
                            Score Global: {(candidate.similarity_score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </ScrollArea>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full rounded-none rounded-r-lg bg-muted/50 hover:bg-muted/90"
              onClick={() => {
                const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
                if (viewport) {
                  viewport.scrollLeft += 200;
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {rankings.map((candidate) => (
          <TabsContent key={candidate.candidate_id} value={candidate.candidate_id}>
            <CandidateDetails candidate={candidate} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CVResultsPage;