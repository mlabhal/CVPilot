import React from 'react';
import { useNavigate } from 'react-router-dom';
import { fullWidthStyle } from './styles';

const CTA: React.FC = () => {
  const navigate = useNavigate();
  
  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    navigate(path);
  };
  
  return (
    <section className="py-20 bg-blue-600 relative overflow-hidden" style={fullWidthStyle}>
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.5" fill="white" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      
      <div className="w-full max-w-7xl mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Prêt à révolutionner votre processus de recrutement ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des milliers d'entreprises qui ont optimisé leur recrutement grâce à notre solution d'analyse de CV.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => handleNavigation('/login')}
              className="bg-white text-blue-600 py-3 px-8 rounded-full hover:bg-gray-100 transition-colors text-lg font-medium"
            >
              Commencer maintenant
            </button>
            <button 
              onClick={() => handleNavigation('/demo')}
              className="bg-transparent text-white border-2 border-white py-3 px-8 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors text-lg font-medium"
            >
              Voir une démo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
