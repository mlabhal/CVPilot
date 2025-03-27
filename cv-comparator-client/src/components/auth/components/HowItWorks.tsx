import React from 'react';
import { fullWidthStyle } from './styles';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      id: 1,
      title: "Définissez vos critères",
      description: "Spécifiez les compétences, l'expérience et les qualifications que vous recherchez."
    },
    {
      id: 2,
      title: "Importez les CV",
      description: "Téléchargez les CV des candidats dans notre système sécurisé en quelques clics."
    },
    {
      id: 3,
      title: "Laissez l'IA travailler",
      description: "Notre algorithme analyse chaque document et évalue la correspondance avec vos critères."
    },
    {
      id: 4,
      title: "Visualisez les résultats",
      description: "Consultez un tableau de bord clair avec des graphiques comparatifs et des recommandations."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-br from-blue-50 to-blue-50" style={fullWidthStyle}>
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Comment ça marche</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un processus simple et efficace pour transformer votre façon de recruter
          </p>
        </div>
        
        <div className="relative">
          <div className="absolute top-24 left-12 right-12 h-1 bg-blue-200 hidden md:block"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.id} className="relative">
                <div className="bg-white p-8 rounded-xl shadow-md relative z-10">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-6 mx-auto md:mx-0">
                    {step.id}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-center md:text-left text-gray-800">{step.title}</h3>
                  <p className="text-gray-600 text-center md:text-left">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
