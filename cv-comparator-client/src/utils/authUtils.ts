// Utilité pour vérifier si on est sur une page d'authentification
export const isAuthPage = (pathname: string): boolean => {
    return pathname === '/login' || 
           pathname === '/register' || 
           pathname === '/forgot-password' || 
           pathname === '/home' || 
           pathname.startsWith('/reset-password/');
  };
  
  // Fonction pour rediriger l'utilisateur après connexion en fonction de son type
  export const redirectAfterLogin = (userType: 'recruteur' | 'candidat' | ''): string => {
    if (userType === 'candidat') {
      return '/channels';
    }
    return '/'; // Par défaut pour les recruteurs
  };