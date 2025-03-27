import React from 'react';
import { CheckCircle, Zap, Clock, Users } from 'lucide-react';
import { FeatureType } from './types';
import { fullWidthStyle } from './styles';

const Features: React.FC = () => {
  const features: FeatureType[] = [
    {
      id: 1,
      icon: <CheckCircle size={40} className="text-blue-500" />,
      title: "Analyse intelligente",
      description: "Notre algorithme analyse chaque CV en détail et les classe selon vos critères spécifiques."
    },
    {
      id: 2,
      icon: <Zap size={40} className="text-yellow-500" />,
      title: "Comparaison rapide",
      description: "Comparez plusieurs CV instantanément et identifiez les meilleurs candidats en quelques secondes."
    },
    {
      id: 3,
      icon: <Clock size={40} className="text-green-500" />,
      title: "Gain de temps",
      description: "Réduisez votre temps de recrutement de 75% grâce à notre système d'analyse automatisé."
    },
    {
      id: 4,
      icon: <Users size={40} className="text-blue-500" />,
      title: "Recrutement objectif",
      description: "Éliminez les biais inconscients et prenez des décisions basées uniquement sur les compétences."
    }
  ];

  return (
    <section id="features" className="py-20 bg-white" style={fullWidthStyle}>
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Fonctionnalités exceptionnelles</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Notre plateforme offre des outils puissants pour optimiser votre processus de recrutement
            et trouver les talents qui correspondent parfaitement à vos besoins.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div 
              key={feature.id} 
              className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="mb-6 transform transition-transform group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;