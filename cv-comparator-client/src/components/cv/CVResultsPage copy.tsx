import React from 'react';
import { Card, CardContent} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { FolderKanban, Briefcase, GraduationCap, Wrench, Brain, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Button } from '../../components/ui/button';
import { Candidate, CVResultsPageProps} from '../../types';



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
      <Card 
      className="w-full shadow-xl border-0 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(249, 250, 251, 0.8)' }}
      >
          {/* ... (CardHeader reste identique) */}
          <CardContent className="p-6">
            <div className="space-y-8">
               {/* Informations de contact */}
               <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                  <div className="w-5 h-5 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg text-zinc-800">Informations de contact</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidate.phone_number && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-md">
                      <div className="w-5 h-5 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-700">Téléphone</p>
                        <p className="text-sm text-zinc-600">{candidate.phone_number}</p>
                      </div>
                    </div>
                  )}
                  
                  {candidate.email && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-md">
                      <div className="w-5 h-5 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-700">Email</p>
                        <p className="text-sm text-zinc-600">{candidate.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              {/* Résumé de l'analyse - Version avec style uniforme blue-50 */}
              {candidate && candidate.summary && typeof candidate.summary === 'string' && candidate.summary.trim() !== "" && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <ClipboardCheck className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Résumé de l'analyse</h3>
                  </div>
                  <div className="prose prose-zinc">
                    <ul className="space-y-3 pl-0">
                      {(() => {
                        // Utilisation d'une IIFE pour éviter les problèmes de TypeScript
                        const summary = candidate.summary as string;
                        const sentences = summary.split('. ').filter(sentence => sentence.trim() !== "");
                        
                        // Style uniforme pour toutes les phrases
                        const style = {
                          bg: "bg-white",
                          border: "border-blue-100",
                          text: "text-blue-500"
                        };
                        
                        return sentences.map((sentence, index) => (
                          <li key={index} className="flex items-start gap-3 pl-0 list-none">
                            {/* Icône de recommandation dans un cercle */}
                            <div className={`mt-0.5 p-1 rounded-full ${style.bg} flex-shrink-0 text-blue-600 shadow-sm`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                              </svg>
                            </div>
                            <span className={`font-medium ${style.text} ${style.bg} px-3 py-2 rounded-md border-l-2 ${style.border} flex-grow shadow-sm`}>
                              {sentence}{index < sentences.length - 1 && sentence.trim().slice(-1) !== '.' ? '.' : ''}
                            </span>
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>
                </section>
              )}
              {/* Expérience */}
              {candidate.experiences && candidate.experiences.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Expérience Professionnelle</h3>
                  </div>
                  <div className="space-y-6">
                    {candidate.experiences.map((exp, i) => (
                      <div key={i} className="relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-blue-300 before:to-blue-100">
                        <div className="font-medium text-zinc-800">{exp.title}</div>
                        <div className="text-sm text-blue-600">{exp.company}</div>
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
              {candidate.projects && Array.isArray(candidate.projects) && candidate.projects.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                    <FolderKanban className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Projets Professionnels</h3>
                  </div>
                  <div className="space-y-6">
                    {candidate.projects.map((project: any, i: number) => (
                      <div 
                        key={i} 
                        className="relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-blue-300 before:to-blue-100"
                      >
                        {/* Affichage du projet comme une chaîne simple */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <div className="font-medium text-lg text-zinc-800">{String(project)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* Compétences et Outils - Maintenant en flex-col */}
              <div className="flex flex-col space-y-8">
                {/* Compétences */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-lg text-zinc-800">Compétences</h3>
                    </div>
                    {/* Ajout du badge de matching des compétences */}
                    {candidate.skill_match_percent !== undefined && (
                      <Badge variant="default" className="bg-blue-50 text-blue-600 border border-blue-200">
                        Skills Match: {candidate.skill_match_percent}%
                      </Badge>
                    )}
                  </div>
                  
                  {candidate.matching_skills && candidate.matching_skills.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-500">Correspondantes</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.matching_skills.map((skill, i) => (
                          <Badge key={i} className="bg-blue-50 text-blue-500 border border-blue-500">
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
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-lg text-zinc-800">Outils</h3>
                    </div>
                    {/* Ajout du badge de matching des outils */}
                    {candidate.tool_match_percent !== undefined && (
                      <Badge variant="default" className="bg-blue-50 text-blue-600 border border-blue-200">
                        Tools Match: {candidate.tool_match_percent}%
                      </Badge>
                    )}
                  </div>

                  {candidate.matching_tools && candidate.matching_tools.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-500">Correspondants</h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.matching_tools.map((tool, i) => (
                          <Badge key={i} className="bg-blue-50 text-blue-500 border border-blue-500">
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
                    <GraduationCap className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg text-zinc-800">Formation</h3>
                  </div>
                  <ul className="space-y-2">
                    {candidate.education.map((edu, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
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
const CVResultsPage: React.FC<CVResultsPageProps> = ({ apiResponse, isFromSearch, resetForm }) => {
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
    (b.skill_match_percent + b.totalScore * 100) - (a.skill_match_percent + a.totalScore * 100)
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
      <div className="flex items-center justify-between mb-8 w-full">
        <h1 className="text-3xl font-bold text-blue-50">
          {isFromSearch ? "Résultats de la Recherche" : "Résultats de l'Analyse des CV"}
        </h1>
        {isFromSearch && (
          <Button 
            className="bg-blue-500 hover:bg-blue-700 text-white ml-auto"
            onClick={resetForm} 
          >
            Nouvelle Recherche
          </Button>
        )}
      </div>
      <Tabs defaultValue={rankings[0].candidate_id} className="w-full">
        <div className="relative mb-14">
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
            
            <ScrollArea className="w-full h-28">
              <div className="p-8 min-w-full flex items-end h-full">
                <TabsList className="inline-flex w-max space-x-2 bg-transparent px-8">
                  {rankings.map((candidate, index) => (
                    <TabsTrigger 
                    key={candidate.candidate_id} 
                    value={candidate.candidate_id}
                    className={`
                      relative flex-shrink-0 flex items-center
                      w-[300px] px-4 py-3 rounded-lg transition-all duration-200
                      ${index === 0 
                        ? 'first-candidate bg-gradient-to-r from-amber-50 to-amber-100 text-amber-900 shadow-lg hover:shadow-xl hover:from-amber-100 hover:to-amber-200 border-2 border-amber-200' 
                        : 'bg-white-50/30 backdrop-blur-sm text-zinc-700 shadow-sm hover:bg-blue-50/10 border border-zinc-200'}
                      data-[state=active]:ring-2 data-[state=active]:ring-blue-200 data-[state=active]:ring-offset-2
                    `}
                  >
                    <div className="flex flex-col w-full">
                      {/* Badge "Top" pour le premier candidat */}
                      {index === 0 && (
                        <div className="absolute -top-3 right-2 z-10">
                          <div className="bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-500">
                            <svg 
                              className="w-3 h-3" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Top
                          </div>
                        </div>
                      )}
                  
                      {/* En-tête avec numéro et nom */}
                      <div className={`text-base font-semibold flex items-center gap-2 ${index === 0 ? 'text-amber-900' : 'text-zinc-700'}`}>
                        <span className={`
                          inline-flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-full text-sm font-semibold
                          ${index === 0 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-zinc-100 text-blue-600'}
                        `}>
                          {index + 1}
                        </span>
                        <span className="truncate">{candidate.displayName}</span>
                      </div>
                  
                      {/* Score global */}
                      <div className="mt-2">
                        <Badge 
                          variant="default" 
                          className={`
                            whitespace-nowrap font-medium w-full justify-center
                            ${index === 0 
                              ? 'bg-white/80 text-amber-700 border-2 border-amber-200 shadow-sm' 
                              : 'bg-white text-blue-600 border border-zinc-200'}
                          `}
                        >
                          Score Global: {(candidate.totalScore * 100).toFixed(0)}%
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

        {/* JavaScript pour positionner le trophée au centre du premier onglet */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function positionTrophy() {
                const firstTab = document.getElementById('first-candidate-tab');
                const trophy = document.getElementById('trophy-container');
                
                if (firstTab && trophy) {
                  const tabRect = firstTab.getBoundingClientRect();
                  const left = tabRect.left + (tabRect.width / 2) - (trophy.offsetWidth / 2);
                  trophy.style.left = left + 'px';
                }
              }
              
              // Position initiale
              setTimeout(positionTrophy, 100);
              
              // Repositionner lors du défilement ou du redimensionnement
              window.addEventListener('resize', positionTrophy);
              document.querySelector('[data-radix-scroll-area-viewport]')?.addEventListener('scroll', positionTrophy);
            `
          }}
        />

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