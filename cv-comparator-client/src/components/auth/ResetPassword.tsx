import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2 } from "lucide-react";
import api from '../../services/api';
import backgroundImage from '../../images/cvtheque.png';

const MAUVE_COLOR = "#6366F1";
const MAUVE_HOVER = "#8B5CF6";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Appel à l'API pour réinitialiser le mot de passe
      await api.post('/users/reset-password', {
        token,
        newPassword: formData.newPassword
      });
      setSuccess(true);
    } catch (err) {
      setError('Le lien de réinitialisation est invalide ou a expiré');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Background Image */}
      <div className="w-1/2 relative">
        <img
          src={backgroundImage}
          alt="CV Pilot Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Title, Description and Form */}
      <div className="w-1/2 bg-white p-8 flex flex-col pt-12">
        {/* Title and Description */}
        <div className="mb-6 text-left pl-8">
          <div className="flex items-center gap-4 mb-3">
            <img
              src="/logo.svg"
              alt="CV Pilot Logo"
              className="w-24 h-24"
            />
            <h1 className="text-5xl font-bold text-gray-900">CV Pilot</h1>
          </div>
          <h2 className="text-xl leading-snug text-gray-600 mb-6 w-full">
            Réinitialisation de votre mot de passe
          </h2>
        </div>

        {/* Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl">
          <div className="px-8 py-6">
            {success ? (
              <div className="text-center py-4">
                <div className="mb-4 text-green-600 text-lg">
                  Votre mot de passe a été réinitialisé avec succès !
                </div>
                <p className="mb-4 text-gray-600">
                  Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{ backgroundColor: MAUVE_COLOR, '--hover-color': MAUVE_HOVER } as React.CSSProperties}
                  className="h-12 text-lg font-semibold text-white w-full hover:bg-[var(--hover-color)]"
                >
                  Se connecter
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4 mb-6">
                  <p className="text-gray-700 mb-4">
                    Veuillez entrer et confirmer votre nouveau mot de passe.
                  </p>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Nouveau mot de passe"
                    className="h-12 text-lg px-4"
                  />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirmer le mot de passe"
                    className="h-12 text-lg px-4"
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  style={{ 
                    backgroundColor: MAUVE_COLOR,
                    '--hover-color': MAUVE_HOVER
                  } as React.CSSProperties}
                  className="w-full h-12 text-lg font-semibold text-white mb-4 hover:bg-[var(--hover-color)]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    'Réinitialiser le mot de passe'
                  )}
                </Button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
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

export default ResetPassword;