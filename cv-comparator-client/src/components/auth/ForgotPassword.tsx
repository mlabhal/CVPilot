import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2 } from "lucide-react";
import api from '../../services/api';
import backgroundImageUrl from '../../images/Flux_Dev_a_breathtakingly_detailed_highcontrast_illustration_o_2.jpeg';
import logoImage from '../../../public/logo.svg';

// Header Component
const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    
    if (path.startsWith('#')) {
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(path);
    }
  };

  return (
    <header 
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white bg-opacity-70 backdrop-blur-sm shadow-md py-2' : 'bg-transparent py-4'
      }`}
      style={{ 
        backgroundImage: scrolled ? 'none' : `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="w-full flex items-center px-4">
        <div className="flex items-center gap-2 pl-2 ml-2">
          <img 
            src={logoImage} 
            alt="CV Pilot Logo" 
            className="h-16 w-auto" 
          />
          <span className="text-xl font-bold text-white">
            CV Pilot
          </span>
        </div>
        
        <nav className="hidden md:flex space-x-4 lg:space-x-8 items-center ml-auto">
          <a href="#features" className="text-gray-700 hover:text-indigo-600 transition-colors whitespace-nowrap">
            Fonctionnalités
          </a>
          <a href="#how-it-works" className="text-gray-700 hover:text-indigo-600 transition-colors whitespace-nowrap">
            Comment ça marche
          </a>
          <a href="#testimonials" className="text-gray-700 hover:text-indigo-600 transition-colors whitespace-nowrap">
            Témoignages
          </a>
          <button 
            onClick={() => handleNavigation('/login')}
            className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-2 px-6 rounded-full hover:shadow-lg transition-all font-medium whitespace-nowrap mr-4"
          >
            Connexion
          </button>
        </nav>
        
        <button className="md:hidden text-gray-700 ml-auto mr-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Veuillez entrer votre adresse e-mail');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Appel à l'API pour demander la réinitialisation du mot de passe
      await api.post('/users/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex justify-center items-center"
      style={{ 
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%'
    }}>
      {/* Header */}
      <Header />
      
      {/* Centered content */}
      <div className="bg-transparent p-6 rounded-lg shadow-xl max-w-md w-full mx-auto mt-24">
        {/* Simple Title */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-white">Réinitialisation de mot de passe</h1>
        </div>
  
        {/* Form Card */}
        <Card 
          className="w-full shadow-xl border-0 backdrop-blur-sm" 
          style={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }} 
        >
          <div className="px-6 py-4">
            {success ? (
              <div className="text-center py-4">
                <div className="mb-4 text-green-600 text-lg">
                  Un email de réinitialisation a été envoyé à votre adresse.
                </div>
                <p className="mb-4 text-gray-700">
                  Veuillez vérifier votre boîte de réception et suivre les instructions pour réinitialiser votre mot de passe.
                </p>
                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{ 
                    background: 'linear-gradient(90deg, #6366F1 0%, #3B82F6 100%)',
                    boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)'
                  } as React.CSSProperties}
                  className="w-full h-10 text-base font-semibold text-white mb-3"
                >
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-3 mb-4">
                  <p className="text-gray-700 mb-2">
                    Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Adresse e-mail"
                    className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-10 text-base font-semibold text-white mb-3 bg-gradient-to-r from-blue-500 to-blue-700 rounded hover:shadow-lg transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm text-blue-600 hover:text-indigo-800 font-medium"
                  >
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;