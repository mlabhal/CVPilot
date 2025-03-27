import { useState, useRef, useEffect, useCallback } from 'react';

interface CameraSetupOptions {
  enabled: boolean;
  onError?: (message: string) => void;
  facingMode?: 'user' | 'environment';
  resolution?: { width: number; height: number };
  metadataTimeout?: number; // Paramètre de timeout configurable
}

export const useCameraSetup = ({
  enabled,
  onError,
  facingMode = 'user',
  resolution = { width: 640, height: 480 },
  metadataTimeout = 15000 // Augmenté à 15 secondes par défaut
}: CameraSetupOptions) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReadyForRecording, setIsReadyForRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Diagnostic de la caméra (compatible avec l'ancien code)
  const diagnoseCameraIssues = useCallback(() => {
    console.log("=== DIAGNOSTIC CAMÉRA ===");
    console.log("cameraActive:", cameraActive);
    console.log("videoRef:", !!videoRef.current);
    console.log("streamRef:", !!streamRef.current);
    
    if (videoRef.current) {
      console.log("Infos vidéo:", {
        srcObject: !!videoRef.current.srcObject,
        readyState: videoRef.current.readyState,
        dimensions: `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
      });
    }
    
    if (streamRef.current) {
      const tracks = streamRef.current.getVideoTracks();
      console.log("Pistes vidéo:", tracks.length, 
        tracks.map(t => ({ enabled: t.enabled, state: t.readyState })));
    }
    console.log("=== FIN DIAGNOSTIC ===");
  }, [cameraActive]);
  
  // Pour la compatibilité avec l'ancien code
  const diagnoseCamera = diagnoseCameraIssues;
  
  // Démarrer la caméra avec stabilité améliorée
  const startCamera = useCallback(async () => {
    if (!enabled) {
      return;
    }
    
    // Éviter les démarrages multiples
    if (streamRef.current && streamRef.current.active) {
      console.debug('La caméra est déjà active, démarrage ignoré');
      setCameraActive(true);
      return;
    }
    
    try {
      console.log('Démarrage de la caméra...');
      setCameraError(null);
      
      // Nettoyage de tout flux existant
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Configuration des contraintes vidéo
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height }
        },
        audio: false
      };
      
      // Obtention du flux média
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Un peu de temps pour que le système s'initialise
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Si videoRef n'est pas disponible, on crée un élément vidéo dans le DOM
      // qui sera utilisé uniquement pour maintenir le flux actif
      if (!videoRef.current) {
        const tempVideo = document.createElement('video');
        tempVideo.autoplay = true;
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.style.position = 'absolute';
        tempVideo.style.opacity = '0';
        tempVideo.style.pointerEvents = 'none';
        tempVideo.style.zIndex = '-1000';
        document.body.appendChild(tempVideo);
        
        tempVideo.srcObject = stream;
        try {
          await tempVideo.play();
          // Si la lecture démarre, on considère la caméra comme active
          setCameraActive(true);
          
          // Configurer un écouteur pour nettoyer l'élément vidéo temporaire
          // quand videoRef devient disponible
          const checkInterval = setInterval(() => {
            if (videoRef.current && streamRef.current) {
              videoRef.current.srcObject = streamRef.current;
              tempVideo.srcObject = null;
              document.body.removeChild(tempVideo);
              clearInterval(checkInterval);
            }
          }, 1000);
          
          // Limiter la durée de vérification à 30 secondes
          setTimeout(() => clearInterval(checkInterval), 30000);
        } catch (err) {
          console.error("Erreur de lecture sur vidéo temporaire:", err);
          throw err;
        }
      } else {
        // Si videoRef est disponible, on l'utilise directement
        videoRef.current.srcObject = stream;
        
        // Attendre que les métadonnées soient chargées avec un timeout configurable
        try {
          const metadataPromise = new Promise<void>((resolve, reject) => {
            if (videoRef.current!.readyState >= 2) {
              resolve();
            } else {
              videoRef.current!.onloadedmetadata = () => resolve();
              videoRef.current!.onerror = () => 
                reject(new Error("Erreur lors du chargement des métadonnées"));
            }
          });
          
          await Promise.race([
            metadataPromise,
            new Promise<void>((_, reject) => 
              setTimeout(() => reject(new Error("Timeout des métadonnées")), metadataTimeout))
          ]);
          
          // Lancer la lecture vidéo
          await videoRef.current.play();
          setCameraActive(true);
        } catch (err) {
          // On réduit le niveau de log à debug au lieu de warning
          console.debug("Métadonnées vidéo non chargées dans le délai imparti, tentative de lecture quand même");
          
          // Même en cas d'erreur, on essaie de démarrer la lecture
          // car sur certains appareils la vidéo fonctionne malgré l'erreur
          try {
            await videoRef.current.play();
            setCameraActive(true);
          } catch (playErr) {
            console.error("Échec lecture vidéo après erreur métadonnées:", playErr);
            throw playErr;
          }
        }
      }
      
      // Exécuter le diagnostic après 3 secondes
      setTimeout(diagnoseCamera, 3000);
    } catch (err) {
      console.error('Erreur d\'activation caméra:', err);
      setCameraActive(false);
      
      // Messages d'erreur plus clairs
      let message = 'Erreur d\'activation de la caméra';
      
      if (err instanceof DOMException) {
        switch(err.name) {
          case 'NotAllowedError':
            message = 'Accès à la caméra refusé. Veuillez autoriser la caméra.';
            break;
          case 'NotFoundError':
            message = 'Aucune caméra détectée sur votre appareil.';
            break;
          case 'NotReadableError':
            message = 'Caméra déjà utilisée par une autre application.';
            break;
          case 'OverconstrainedError':
            message = 'Résolution vidéo non supportée par votre caméra.';
            break;
        }
      }
      
      setCameraError(message);
      onError?.(message);
      diagnoseCamera();
    }
  }, [enabled, facingMode, resolution, onError, diagnoseCamera, metadataTimeout]);
  
  // Arrêt de la caméra simplifié
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Nettoyer les éléments vidéo temporaires dans le DOM
      document.querySelectorAll('video[style*="opacity: 0"]').forEach(el => {
        if (el.parentNode) {
          (el as HTMLVideoElement).srcObject = null;
          el.parentNode.removeChild(el);
        }
      });
      
      setCameraActive(false);
    }
  }, []);
  
  // Forcer le redémarrage de la caméra
  const restartCamera = useCallback(() => {
    stopCamera();
    // Petit délai avant redémarrage
    setTimeout(() => {
      if (enabled) {
        startCamera();
      }
    }, 500);
  }, [enabled, startCamera, stopCamera]);
  
  // Fonction pour forcer l'affichage vidéo
  const forceVideoDisplay = useCallback(() => {
    if (!videoRef.current || !streamRef.current) {
      console.error("Impossible de forcer l'affichage vidéo: références manquantes");
      return false;
    }
    
    try {
      // Détacher et réattacher le flux
      videoRef.current.srcObject = null;
      
      // Petit délai avant de réattacher
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play()
            .then(() => console.log("Affichage vidéo forcé avec succès"))
            .catch(err => console.error("Échec du forçage vidéo:", err));
        }
      }, 300);
      
      return true;
    } catch (err) {
      console.error("Erreur lors du forçage vidéo:", err);
      return false;
    }
  }, []);
  
  // Effet pour gérer le cycle de vie de la caméra
  useEffect(() => {
    if (enabled) {
      const timer = setTimeout(startCamera, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera]);
  
  // Méthode pour obtenir le flux de la caméra (utile pour l'enregistrement)
  const getMediaStream = useCallback(() => {
    return streamRef.current;
  }, []);
  
  // Méthode pour vérifier si la vidéo est prête pour l'enregistrement
  const checkReadyForRecording = useCallback(() => {
    const ready = !!(streamRef.current && 
                   streamRef.current.active && 
                   streamRef.current.getVideoTracks().length > 0 &&
                   streamRef.current.getVideoTracks()[0].readyState === 'live');
    
    setIsReadyForRecording(ready);
    return ready;
  }, []);

  // Effect pour mettre à jour l'état "prêt pour l'enregistrement"
  useEffect(() => {
    if (cameraActive) {
      // Vérifier l'état après un court délai
      const timer = setTimeout(() => {
        checkReadyForRecording();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setIsReadyForRecording(false);
    }
  }, [cameraActive, checkReadyForRecording]);

  return {
    videoRef,
    cameraActive,
    cameraError,
    isReadyForRecording,
    startCamera,
    stopCamera,
    restartCamera,
    diagnoseCamera,
    diagnoseCameraIssues,
    forceVideoDisplay,
    getMediaStream,
    checkReadyForRecording
  };
};