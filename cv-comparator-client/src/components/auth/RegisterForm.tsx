import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2, X } from "lucide-react";
import api from '../../services/api';
import type { AuthComponentProps } from '../../types/auth';
import backgroundImageUrl from '../../images/Flux_Dev_a_breathtakingly_detailed_highcontrast_illustration_o_2.jpeg';
import Header from './Header';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  type: string;
  companyName: string;
  acceptCGU: boolean;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}


const RegisterForm: React.FC<AuthComponentProps> = ({ setIsAuthenticated, setUserType }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    type: '', // Valeur vide par défaut
    companyName: '',
    acceptCGU: false
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCGUModal, setShowCGUModal] = useState<boolean>(false);

  // Vérifier si le champ companyName doit être requis en fonction du type
  useEffect(() => {
    if (formData.type === 'candidat') {
      setFormData(prev => ({ ...prev, companyName: '' }));
    }
  }, [formData.type]);

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.name || !formData.type) {
      setError('Tous les champs sont requis');
      return false;
    }

    if (formData.type === '') {
      setError('Veuillez sélectionner un type de compte');
      return false;
    }

    if (formData.type === 'recruteur' && !formData.companyName) {
      setError('Le nom de l\'entreprise est requis pour un recruteur');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email invalide');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    if (!formData.acceptCGU) {
      setError('Vous devez accepter les Conditions Générales d\'Utilisation');
      return false;
    }

    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError('');
    
    try {
      // Inscription
      const response = await api.auth.register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        type: formData.type,
        companyName: formData.type === 'recruteur' ? formData.companyName : ''
      });
      
      // Log complet de la réponse pour débogage
      console.log("Réponse complète de l'API:", response);
      
      // Vérifier que le token existe dans la réponse
      if (!response.data || !response.data.token) {
        console.error("Pas de token dans la réponse:", response);
        throw new Error("Token non reçu du serveur");
      }
      
      // Stocker le token et attendre un moment pour s'assurer qu'il est bien enregistré
      console.log("Token reçu:", response.data.token);
      localStorage.setItem('token', response.data.token);
      
      // Stocker le nom d'utilisateur aussi pour éviter un appel API immédiat qui pourrait échouer
      if (response.data.name || formData.name) {
        localStorage.setItem('userName', response.data.name || formData.name);
      }
      // Stocker le type d'utilisateur et mettre à jour l'état dans App
      localStorage.setItem('userType', formData.type);
      if (setUserType) {
        setUserType(formData.type as '' | 'recruteur' | 'candidat');
      }
      
      localStorage.setItem('userDataUpdated', 'true');
      localStorage.setItem('justRegistered', 'true');
      
      // Attendre plus longtemps pour s'assurer que localStorage est mis à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Vérifier que le token a bien été enregistré
      const storedToken = localStorage.getItem('token');
      console.log("Token stocké dans localStorage:", storedToken);
      
      if (!storedToken) {
        throw new Error("Échec de l'enregistrement du token");
      }
      
      // Définir l'authentification
      setIsAuthenticated(true);
      
      // Vérifier s'il y a une URL de redirection
      const redirectUrl = localStorage.getItem('redirectAfterLogin');
      console.log("URL de redirection récupérée:", redirectUrl);
      
      if (redirectUrl) {
        // Nettoyer le localStorage
        localStorage.removeItem('redirectAfterLogin');
        console.log("Redirection vers:", redirectUrl);
        
        // Attendre plus longtemps avant la redirection pour s'assurer que tout est initialisé
        setTimeout(() => {
          // Utiliser window.location.href pour une redirection complète qui recharge la page
          window.location.href = redirectUrl;
        }, 800);
      } else {
        // Rediriger en fonction du type d'utilisateur
        console.log("Redirection basée sur le type d'utilisateur:", formData.type);
        
        // Utiliser window.location.href au lieu de navigate pour forcer un rechargement complet
        setTimeout(() => {
          if (formData.type === 'candidat') {
            window.location.href = '/channels';
          } else {
            window.location.href = '/';
          }
        }, 800);
      }
      
    } catch (err) {
      console.error("Erreur complète:", err);
      
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.message || 
        'Une erreur est survenue lors de l\'inscription'
      );
      
      // Nettoyer localStorage en cas d'erreur
      localStorage.removeItem('token');
      localStorage.removeItem('justRegistered');
      localStorage.removeItem('userDataUpdated');
      localStorage.removeItem('userType');
      
    } finally {
      setIsLoading(false);
    }
  };

  // Contenu des CGU à afficher dans le modal
  const CGUContent = () => {
    return (
      <div className="cgu-content overflow-y-auto max-h-[70vh] text-sm">
        <h1 className="text-2xl font-bold mb-4">CONDITIONS GÉNÉRALES D'UTILISATION</h1>
        <h2 className="text-xl font-semibold mb-2">Application CV Pilot</h2>
        
        <p className="mb-4"><strong>Date de dernière mise à jour : 26 février 2025</strong></p>
        
        <h2 className="text-lg font-semibold mb-2">1. PRÉSENTATION DE L'APPLICATION</h2>
        <p className="mb-4">
          CV Pilot est une application permettant aux recruteurs de comparer et d'analyser des CV 
          à l'aide de technologies d'intelligence artificielle.
        </p>
        
        <h2 className="text-lg font-semibold mb-2">2. ACCEPTATION DES CONDITIONS GÉNÉRALES D'UTILISATION</h2>
        <p className="mb-4">
          L'accès et l'utilisation de l'Application sont soumis à l'acceptation et au respect des présentes CGU. 
          En utilisant l'Application, l'Utilisateur reconnaît avoir pris connaissance des présentes CGU et les accepter sans réserve.
        </p>
        
        <h2 className="text-lg font-semibold mb-2">3. DESCRIPTION DES SERVICES</h2>
        <p className="mb-4">
          L'Application CV Pilot offre les fonctionnalités suivantes :
          <ul className="list-disc ml-6 mt-2">
            <li>Téléchargement et stockage de CV de candidats</li>
            <li>Analyse automatisée des CV par intelligence artificielle</li>
            <li>Comparaison de plusieurs CV selon des critères prédéfinis ou personnalisés</li>
            <li>Génération de rapports d'analyse et de comparaison</li>
            <li>Classement et organisation des candidatures</li>
          </ul>
        </p>
        
        <h2 className="text-lg font-semibold mb-2">4. PROTECTION DES DONNÉES PERSONNELLES</h2>
        <p className="mb-4">
          Notre application s'engage à respecter la réglementation en vigueur applicable au traitement 
          de données à caractère personnel, notamment la loi 09-08 relative à la protection des personnes 
          physiques à l'égard du traitement des données à caractère personnel au Maroc.
        </p>
        
        <h2 className="text-lg font-semibold mb-2">5. PROPRIÉTÉ INTELLECTUELLE</h2>
        <p className="mb-4">
          L'Application, sa structure, son contenu, ses fonctionnalités, son interface, son design et tous 
          les éléments qui la composent sont protégés par les droits de propriété intellectuelle.
        </p>
        
        <h2 className="text-lg font-semibold mb-2">6. LOI APPLICABLE ET JURIDICTION COMPÉTENTE</h2>
        <p className="mb-4">
          Les présentes CGU sont régies par le droit marocain. En cas de litige, les tribunaux marocains seront compétents.
        </p>
      </div>
    );
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
      <Header backgroundImageUrl={backgroundImageUrl} />

      {/* Centered content */}
      <div className="bg-transparent p-6 rounded-lg shadow-xl max-w-md w-full mx-auto mt-24 mb-12">
        {/* Title */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-white">Inscrivez-vous</h1>
        </div>
  
        {/* Register Form */}
        <Card 
          className="w-full shadow-xl border-0 backdrop-blur-sm" 
          style={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
        >
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-3">
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nom complet"
                  className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                />
  
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Adresse e-mail"
                  className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                />
  
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mot de passe"
                  className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                />
  
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmer le mot de passe"
                  className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                />
                
                <div className="relative">
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={(e) => {
                      const { name, value } = e.target;
                      setFormData(prev => ({
                        ...prev,
                        [name]: value
                      }));
                      if (error) setError('');
                    }}
                    className="h-10 text-base px-3  text-gray-500 placeholder:text-gray-300 w-full rounded-md appearance-none"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      paddingRight: '2.5rem' // Espace pour la flèche personnalisée
                    }}
                  >
                    <option value="" disabled selected={formData.type === ''}>Type de compte</option>
                    <option value="candidat" className="h-10 text-base px-3 text-black">Candidat</option>
                    <option value="recruteur"className="h-10 text-base px-3 text-black ">Recruteur</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                    <svg 
                      className="w-4 h-4 text-indigo-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
  
                {/* Champ Entreprise (visible uniquement pour les recruteurs) */}
                {formData.type === 'recruteur' && (
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Nom de l'entreprise"
                    className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                  />
                )}
  
                {/* Case à cocher pour les CGU */}
                <div className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    id="acceptCGU"
                    name="acceptCGU"
                    checked={formData.acceptCGU}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label htmlFor="acceptCGU" className="text-gray-700 text-xs">
                    J'accepte les{" "}
                    <span 
                      className="text-blue-500 cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowCGUModal(true);
                      }}
                    >
                      Conditions Générales d'Utilisation
                    </span>
                  </label>
                </div>
              </div>
  
              {error && (
                <Alert variant="destructive" className="mt-3">
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
                    Inscription en cours...
                  </>
                ) : (
                  'S\'inscrire'
                )}
              </Button>
  
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-blue-600">ou</span>
                </div>
              </div>
  
              <Button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-10 text-base font-semibold text-white mb-3 bg-gradient-to-r from-blue-500 to-blue-700 rounded hover:shadow-lg transition-all"
              >
                Se connecter avec un compte existant
              </Button>
            </form>
          </div>
        </Card>
      </div>
  
      {/* Modal des CGU */}
      {showCGUModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 relative">
            <button 
              onClick={() => setShowCGUModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-3">Conditions Générales d'Utilisation</h2>
            <CGUContent />
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setShowCGUModal(false)}
                style={{ 
                  background: 'linear-gradient(90deg, #6366F1 0%, #3B82F6 100%)',
                  boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)'
                } as React.CSSProperties}
                className="px-4 py-1 text-sm text-white"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;