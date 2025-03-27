// src/components/quiz/WebcamMonitor.tsx - Version corrigée pour centrage
import React, { useEffect, useRef } from 'react';

type ObjectFitType = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

interface WebcamMonitorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  isLoading?: boolean;
  isPhoneDetected?: boolean;
  statusText?: string;
  onRetry?: () => void;
  width?: string | number;
  height?: string | number;
  objectFit?: ObjectFitType;
  diagnoseCameraIssues?: () => void;
  forceVideoDisplay?: () => boolean;
}

const WebcamMonitor: React.FC<WebcamMonitorProps> = ({
  videoRef,
  isActive,
  isLoading = false,
  isPhoneDetected = false,
  statusText = '',
  onRetry,
  width = '500px',
  height = '300px',
  objectFit = 'contain'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Effets pour appliquer les styles directement, en contournant Tailwind
  useEffect(() => {
    if (containerRef.current) {
      // Appliquer des styles directs au conteneur
      const container = containerRef.current;
      
      // Réinitialiser les styles du conteneur
      container.className = isPhoneDetected 
        ? 'webcam-container phone-detected' 
        : 'webcam-container';
      
      // Styles directs forcés
      Object.assign(container.style, {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#000000',
        margin: '0 auto 1.5rem auto',
        borderRadius: '0.5rem',
        border: isPhoneDetected ? '2px solid #ef4444' : '1px solid #d1d5db',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      });
    }
    
    if (videoRef.current) {
      // Réinitialiser les styles de la vidéo
      videoRef.current.className = '';
      
      // Appliquer des styles directs
      Object.assign(videoRef.current.style, {
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
        objectFit: objectFit,
        objectPosition: '50% 50%', // Centre l'image explicitement
        transform: 'scaleX(-1)',   // Effet miroir
        margin: '0 auto',          // Centrage horizontal
        display: 'block',          // Empêche les espaces blancs indésirables
        backfaceVisibility: 'hidden',
        webkitBackfaceVisibility: 'hidden',
        willChange: 'transform',
        transition: 'none',
        filter: 'blur(0)'
      });
    }
  }, [videoRef, width, height, objectFit, isPhoneDetected]);
  
  return (
    <div ref={containerRef} className="webcam-container">
      {/* Vidéo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
      />
      
      {/* Overlay pour caméra inactive */}
      {!isActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 10,
          color: 'white',
          padding: '1rem'
        }}>
          <p style={{marginBottom: '1rem', textAlign: 'center'}}>
            La caméra est en cours d'initialisation...
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          )}
        </div>
      )}
      
      {/* Indicateur de chargement */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          left: '0.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          zIndex: 5
        }}>
          Chargement...
        </div>
      )}
      
      {/* Statut en bas à droite */}
      {statusText && (
        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          right: '0.5rem',
          backgroundColor: '#374151',
          color: 'white',
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          zIndex: 5
        }}>
          {statusText}
        </div>
      )}
    </div>
  );
};

export default WebcamMonitor;