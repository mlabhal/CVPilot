import React from 'react';
import { useLocation } from 'react-router-dom';

// Composant utilitaire pour accéder au pathname
const PathAwareComponent = ({ children }: { children: (pathname: string) => React.ReactNode }) => {
  const location = useLocation();
  return <>{children(location.pathname)}</>;
};

export default PathAwareComponent;