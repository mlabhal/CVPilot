import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SlideType } from './types';
import timeSavingImage from '../../../images/Flux_Schnell_A_stunning_and_vibrant_cinematic_photo_of_A_breat_0.jpeg';
import skillsVisualizationImage from '../../../images/Flux_Schnell_A_breathtaking_vibrant_and_cinematic_photograph_o_1.jpeg';
import cvAnalysisImage from '../../../images/Flux_Schnell_A_stunning_and_vibrant_cinematic_photograph_of_a__2.jpeg';

const Slider: React.FC = () => {
  const navigate = useNavigate();

  const slides: SlideType[] = [
    {
      id: 1,
      title: "Trouvez les meilleurs candidats sans effort",
      subtitle: "Notre IA analyse et classe les CV en fonction de vos critères spécifiques.",
      imageSrc: cvAnalysisImage,
      ctaText: "Commencer l'analyse",
      ctaLink: "/login"
    },
    {
      id: 2,
      title: "Une vision claire des compétences",
      subtitle: "Visualisez et comparez les compétences des candidats avec des graphiques dynamiques.",
      imageSrc: skillsVisualizationImage,
      ctaText: "Voir les fonctionnalités",
      ctaLink: "#features"
    },
    {
      id: 3,
      title: "Économisez du temps et des ressources",
      subtitle: "Réduisez votre temps de recrutement de 75% grâce à l'automatisation intelligente.",
      imageSrc: timeSavingImage,
      ctaText: "Découvrir notre offre",
      ctaLink: "#pricing"
    }
  ];

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    
    if (path.startsWith('#')) {
      const element = document.querySelector(path);
      if (element) {
        // Calculer la hauteur actuelle du header
        const scrolled = window.scrollY > 20;
        const headerHeight = scrolled ? 80 : 64; // 5rem ou 4rem en pixels
        
        // Calculer la position avec offset
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
        
        // Faire défiler jusqu'à la position ajustée
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    } else {
      navigate(path);
    }
  };

  return (
    <div 
      className="relative overflow-hidden" 
      style={{
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        boxSizing: 'border-box',
        position: 'relative',
        left: 0,
        paddingTop: "2rem",
        minHeight: "700px"
      }}
    >
      <div className="absolute inset-x-0 top-22 bottom-0 z-0 opacity-10">
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-200 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-100 to-transparent"></div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="0.5" />
          </pattern>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      <div 
        className="relative overflow-hidden" 
        style={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          boxSizing: 'border-box',
          position: 'relative',
          left: 0,
          paddingTop: "4rem",
          minHeight: "700px"
        }}
      >
        <div className="absolute inset-x-0 top-22 bottom-0 z-0 opacity-10">
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-200 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-100 to-transparent"></div>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="0.5" />
            </pattern>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative h-full">
          <div className="w-full max-w-7xl mx-auto px-1 py-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {slides.map((slide) => (
                <div 
                  key={slide.id} 
                  className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 hover:shadow-xl"
                >
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={slide.imageSrc} 
                      alt={slide.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 text-gray-800">{slide.title}</h3>
                    <p className="text-gray-600 mb-6">{slide.subtitle}</p>
                    <button 
                      onClick={() => handleNavigation(slide.ctaLink)}
                      className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 px-4 rounded-full hover:shadow-lg transition-all text-sm font-medium flex items-center group w-full justify-center"
                    >
                      {slide.ctaText}
                      <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Slider;