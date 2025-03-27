import { useState, useEffect } from 'react';
import { FileText, Search, Coffee, Brain, Zap } from 'lucide-react';

const FunCVLoader = () => {
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Réception de vos CV...');

  const messages = [
    "Réception de vos CV...",
    "Lecture du contenu...",
    "Analyse des compétences...",
    "Comparaison des profils...",
    "Évaluation de l'expérience...",
    "Application de l'intelligence artificielle...",
    "Génération des résultats...",
    "C'est presque fini !"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prevStep) => (prevStep + 1) % 4);
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-indigo-50 rounded-lg text-center">
      <div className="flex justify-center mb-6 relative h-24">
        {/* Pile de documents à gauche */}
        <div className="absolute left-0 transform -translate-x-4 translate-y-4">
          {[...Array(3)].map((_, i) => (
            <div 
              key={`left-${i}`} 
              className="absolute" 
              style={{ 
                top: `${i * 3}px`, 
                left: `${i * 3}px`,
                zIndex: 3 - i 
              }}
            >
              <FileText size={48} className="text-indigo-300" />
            </div>
          ))}
        </div>

        {/* Animation centrale */}
        <div className="flex flex-col items-center justify-center mx-4 w-48">
          <div className={`transition-all duration-500 transform ${step === 0 ? 'scale-110' : 'scale-100'}`}>
            <Search size={36} className={`text-blue-600 ${step === 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div className={`transition-all duration-500 transform ${step === 1 ? 'scale-110' : 'scale-100'}`}>
            <Brain size={36} className={`text-purple-600 ${step === 1 ? 'animate-pulse' : ''}`} />
          </div>
          <div className={`transition-all duration-500 transform ${step === 2 ? 'scale-110' : 'scale-100'}`}>
            <Zap size={36} className={`text-yellow-500 ${step === 2 ? 'animate-pulse' : ''}`} />
          </div>
          <div className={`transition-all duration-500 transform ${step === 3 ? 'scale-110' : 'scale-100'}`}>
            <Coffee size={36} className={`text-amber-600 ${step === 3 ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* Pile de documents à droite */}
        <div className="absolute right-0 transform translate-x-4 translate-y-4">
          {[...Array(3)].map((_, i) => (
            <div 
              key={`right-${i}`} 
              className="absolute" 
              style={{ 
                top: `${i * 3}px`, 
                right: `${i * 3}px`,
                zIndex: 3 - i 
              }}
            >
              <FileText size={48} className="text-green-300" />
            </div>
          ))}
        </div>

        {/* Document en déplacement */}
        <div 
          className="absolute transition-all duration-1000 ease-in-out"
          style={{
            left: `${step % 2 === 0 ? '0' : '70%'}`,
            top: '20%',
            opacity: step === 3 ? 0 : 1,
            transform: `rotate(${step * 5}deg)`
          }}
        >
          <FileText size={36} className="text-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-full px-6 py-3 shadow-sm inline-block">
        <p className="text-gray-700 font-medium">{message}</p>
      </div>

      {/* Barre de progression */}
      <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${25 + (step * 15)}%` }}
        ></div>
      </div>
      
      <p className="mt-4 text-xs text-gray-500">Nos experts virtuels analysent vos CV avec soin</p>
    </div>
  );
};

export default FunCVLoader;