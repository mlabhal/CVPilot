import React from 'react';
import { useNavigate } from 'react-router-dom';
import {  
  CheckCircle, 
  Zap,
  Clock, 
  Users,
  ArrowRight,
  Github,
  Linkedin,
  Twitter
} from 'lucide-react';
import timeSavingImage from '../../images/Flux_Schnell_A_stunning_and_vibrant_cinematic_photo_of_A_breat_0.jpeg';
import skillsVisualizationImage from '../../images/Flux_Schnell_A_breathtaking_vibrant_and_cinematic_photograph_o_1.jpeg';
import cvAnalysisImage from '../../images/Flux_Schnell_A_stunning_and_vibrant_cinematic_photograph_of_a__2.jpeg';
import backgroundImage from '../../images/Flux_Dev_a_breathtakingly_detailed_highcontrast_illustration_o_2.jpeg';
import Header from "./Header";
import logoImage from '../../../public/logo.svg';

// Style commun pour la pleine largeur
const fullWidthStyle: React.CSSProperties = {
  width: '100vw',
  marginLeft: 'calc(-50vw + 50%)',
  boxSizing: 'border-box',
  position: 'relative',
  left: 0
};
// Types
interface SlideType {
  id: number;
  title: string;
  subtitle: string;
  imageSrc: string;
  ctaText: string;
  ctaLink: string;
}

interface FeatureType {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}


// Slider Component
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
          paddingTop: "7rem",
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
            {/* Affichage en rectangles arrondis au lieu de slider */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {slides.map((slide) => (
                <div 
                  key={slide.id} 
                  className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 hover:shadow-xl"
                >
                  {/* Image */}
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={slide.imageSrc} 
                      alt={slide.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Contenu texte */}
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

// Features Section Component
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

// How It Works Section
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

// Call-to-Action Section
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

// Testimonials Section
const Testimonials: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      name: "Marie Dupont",
      role: "DRH, Tech Solutions",
      quote: "CVAnalyzer a révolutionné notre processus de recrutement. Nous économisons des heures de travail et trouvons de meilleurs candidats.",
      avatar: "/api/placeholder/60/60"
    },
    {
      id: 2,
      name: "Jean Martin",
      role: "Recruteur, Global Corp",
      quote: "Je peux désormais comparer efficacement des dizaines de candidats en quelques minutes. Un outil indispensable pour tout recruteur moderne.",
      avatar: "/api/placeholder/60/60"
    },
    {
      id: 3,
      name: "Sophie Bernard",
      role: "PDG, StartupLab",
      quote: "Cette solution nous a permis d'identifier des talents que nous aurions manqués avec nos méthodes traditionnelles. Un investissement qui a changé notre entreprise.",
      avatar: "/api/placeholder/60/60"
    }
  ];

  return (
    <section id="testimonials" className="py-20 bg-gray-50" style={fullWidthStyle}>
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Ce que nos clients disent</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez comment notre solution transforme le recrutement pour des entreprises de toutes tailles
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="bg-white p-8 rounded-xl shadow-md relative hover:shadow-lg transition-shadow"
            >
              <div className="mb-6">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 10H10C8.89543 10 8 10.8954 8 12V20C8 21.1046 8.89543 22 10 22H18C19.1046 22 20 21.1046 20 20V12C20 10.8954 19.1046 10 18 10Z" fill="#6366F1"/>
                  <path d="M18 26H10C8.89543 26 8 26.8954 8 28V36C8 37.1046 8.89543 38 10 38H18C19.1046 38 20 37.1046 20 36V28C20 26.8954 19.1046 26 18 26Z" fill="#6366F1"/>
                  <path d="M34 10H26C24.8954 10 24 10.8954 24 12V20C24 21.1046 24.8954 22 26 22H34C35.1046 22 36 21.1046 36 20V12C36 10.8954 35.1046 10 34 10Z" fill="#6366F1"/>
                  <path d="M34 26H26C24.8954 26 24 26.8954 24 28V36C8 37.1046 24.8954 38 26 38H34C35.1046 38 36 37.1046 36 36V28C36 26.8954 35.1046 26 34 26Z" fill="#6366F1"/>
                </svg>
              </div>
              <p className="text-gray-600 mb-6">"{testimonial.quote}"</p>
              <div className="flex items-center">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name} 
                  className="w-12 h-12 rounded-full mr-4 object-cover"
                />
                <div>
                  <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Footer Component
const Footer: React.FC = () => {
  const navigate = useNavigate();
  
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
    <footer className="bg-gray-900 text-gray-400" style={{ 
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      boxSizing: 'border-box',
      position: 'relative',
      left: 0
    }}>
      <div className="w-full max-w-7xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img 
                src={logoImage} 
                alt="CV Pilot Logo" 
                className="h-16 w-auto" 
                onClick={() => handleNavigation('/home')}
                style={{ cursor: 'pointer' }}
              />
              <span 
                className="text-xl font-bold text-white"
                onClick={() => handleNavigation('/home')}
                style={{ cursor: 'pointer' }}
              >
                CV<span className="font-extrabold">Pilot</span>
              </span>
            </div>
            <p className="mb-6">
              La plateforme d'analyse de CV qui révolutionne le processus de recrutement grâce à l'intelligence artificielle.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-6">Navigation</h3>
            <ul className="space-y-3">
              <li><button onClick={() => handleNavigation('/home')} className="hover:text-blue-400 transition-colors">Accueil</button></li>
              <li><button onClick={() => handleNavigation('#features')} className="hover:text-blue-400 transition-colors">Fonctionnalités</button></li>
              <li><button onClick={() => handleNavigation('#how-it-works')} className="hover:text-blue-400 transition-colors">Comment ça marche</button></li>
              <li><button onClick={() => handleNavigation('#testimonials')} className="hover:text-blue-400 transition-colors">Témoignages</button></li>
              <li><button onClick={() => handleNavigation('#pricing')} className="hover:text-blue-400 transition-colors">Tarifs</button></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-6">Légal</h3>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Conditions d'utilisation</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Cookies</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Mentions légales</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-6">Contact</h3>
            <ul className="space-y-3">
              <li>support@cvanalyzer.com</li>
              <li>+33 1 23 45 67 89</li>
              <li>123 Avenue des Startups, 75001 Paris</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 mt-12 text-center">
          <p>&copy; {new Date().getFullYear()} CVAnalyzer. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

// Main HomePage Component
const HomePage: React.FC = () => {
  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <Header backgroundImageUrl={backgroundImage} />
      <Slider />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
};

export default HomePage;