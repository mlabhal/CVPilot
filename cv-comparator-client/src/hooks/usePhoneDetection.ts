// src/hooks/usePhoneDetection.ts
import { useState, useEffect, useRef, RefObject, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface PhoneDetectionOptions {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  onPhoneDetected?: () => void;
  detectionThreshold?: number; // Nombre de détections avant de déclencher onPhoneDetected
  confidenceThreshold?: number; // Seuil de confiance pour la détection (0-1)
}

interface PhoneDetectionResult {
  model: cocoSsd.ObjectDetection | null;
  phoneDetected: boolean;
  phoneDetections: number;
  isLoading: boolean;
  status: string;
  detectionLogs: Array<{time: Date, objects: any[]}>;
  debugMode: boolean;
  toggleDebugMode: () => void;
}

export function usePhoneDetection({
  enabled,
  videoRef,
  onPhoneDetected,
  detectionThreshold = 3,
  confidenceThreshold = 0.6
}: PhoneDetectionOptions): PhoneDetectionResult {
  // États pour la détection
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [phoneDetected, setPhoneDetected] = useState<boolean>(false);
  const [phoneDetections, setPhoneDetections] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Non initialisé');
  
  // États pour le débogage
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [detectionLogs, setDetectionLogs] = useState<Array<{time: Date, objects: any[]}>>([]);
  
  // Intervalles et références
  const detectionIntervalRef = useRef<number | null>(null);
  const phoneDetectionsRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  
  // Référence au document.visibilityState pour réduire la charge quand l'onglet est inactif
  const isPageVisibleRef = useRef<boolean>(true);
  
  // Constantes pour l'optimisation
  const DETECTION_INTERVAL = 5000; // Augmentation de l'intervalle à 5 secondes
  const REDUCED_WIDTH = 320; // Largeur réduite pour traitement
  const REDUCED_HEIGHT = 240; // Hauteur réduite pour traitement
  
  // Synchroniser la référence avec l'état
  useEffect(() => {
    phoneDetectionsRef.current = phoneDetections;
  }, [phoneDetections]);
  
  // Fonction pour activer/désactiver le mode débogage
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);
  
  // Détecter la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible';
      console.log('[TF] Visibilité de la page:', isPageVisibleRef.current);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Chargement du modèle TensorFlow
  useEffect(() => {
    if (enabled && !model && !isLoading) {
      const loadModel = async () => {
        try {
          setIsLoading(true);
          setStatus('Initialisation de TensorFlow.js...');
          console.log('[TF] Initialisation de TensorFlow.js...');
          
          // Configuration du backend WebGL pour des performances optimales
          await tf.setBackend('webgl');
          await tf.ready();
          setStatus('TensorFlow.js initialisé, chargement du modèle...');
          console.log('[TF] TensorFlow.js initialisé');
          
          // Charger le modèle COCO-SSD
          const loadedModel = await cocoSsd.load({
            base: 'lite_mobilenet_v2' // Utiliser un modèle plus léger
          });
          setStatus('Modèle COCO-SSD chargé et prêt');
          console.log('[TF] Modèle COCO-SSD chargé et prêt');
          setModel(loadedModel);
        } catch (err) {
          console.error('[TF] Erreur de chargement du modèle:', err);
          setStatus(`Erreur: ${err}`);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadModel();
    }
    
    return () => {
      // Nettoyer l'intervalle de détection si existant
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [enabled, model, isLoading]);
  
  // Activer le mode débogage avec Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        toggleDebugMode();
        console.log('[TF] Mode débogage:', !debugMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [debugMode, toggleDebugMode]);
  
  // Fonction optimisée de détection
  const detectPhone = useCallback(async () => {
    // Éviter les traitements parallèles
    if (isProcessingRef.current || !videoRef.current || !model || !isPageVisibleRef.current) return;
    
    try {
      isProcessingRef.current = true;
      
      // Réduire la taille de l'image pour économiser des ressources
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      
      if (!context) {
        console.error('[TF] Impossible d\'obtenir le contexte 2D');
        return;
      }
      
      tempCanvas.width = REDUCED_WIDTH;
      tempCanvas.height = REDUCED_HEIGHT;
      
      // Dessiner l'image réduite
      context.drawImage(videoRef.current, 0, 0, REDUCED_WIDTH, REDUCED_HEIGHT);
      
      // Prédictions avec le modèle COCO-SSD
      const startTime = performance.now();
      const predictions = await model.detect(tempCanvas);
      const endTime = performance.now();
      
      if (debugMode) {
        console.log(`[TF] Détection terminée en ${(endTime - startTime).toFixed(2)}ms`);
        console.log('[TF] Objets détectés:', predictions);
      }
      
      // Ajouter au log de détection (seulement en mode débug pour économiser la mémoire)
      if (debugMode) {
        setDetectionLogs(prev => {
          const newLogs = [...prev, {time: new Date(), objects: predictions}];
          // Garder seulement les 10 derniers logs
          return newLogs.slice(-10);
        });
      }
      
      // Rechercher si un téléphone est détecté (classe 'cell phone')
      const phone = predictions.find(
        p => p.class === 'cell phone' && p.score > confidenceThreshold
      );
      
      const wasPhoneDetected = !!phone;
      setPhoneDetected(wasPhoneDetected);
      
      if (wasPhoneDetected) {
        if (debugMode) {
          console.log('[TF] Téléphone détecté!', phone);
        }
        
        const newDetectionCount = phoneDetectionsRef.current + 1;
        setPhoneDetections(newDetectionCount);
        
        // Si le seuil de détections est atteint, déclencher le callback
        if (newDetectionCount >= detectionThreshold && onPhoneDetected) {
          console.log('[TF] Seuil de détections atteint');
          onPhoneDetected();
        }
      }
    } catch (err) {
      console.error('[TF] Erreur pendant la détection:', err);
      setStatus(`Erreur de détection: ${err}`);
    } finally {
      isProcessingRef.current = false;
    }
  }, [model, videoRef, confidenceThreshold, debugMode, onPhoneDetected, detectionThreshold]);
  
  // Détection périodique de téléphone
  useEffect(() => {
    // Ne commencer la détection que si le modèle est chargé et la vidéo est active
    const shouldDetect = enabled && 
                         model && 
                         videoRef.current && 
                         videoRef.current.readyState === 4;
    
    if (shouldDetect) {
      console.log('[TF] Démarrage de la détection périodique');
      setStatus('Détection active');
      
      // Exécuter une première détection après un léger délai
      const initialDetectionTimeout = setTimeout(() => {
        detectPhone();
      }, 500);
      
      // Démarrer l'intervalle de détection avec l'intervalle optimisé
      detectionIntervalRef.current = window.setInterval(() => {
        // Vérifier si la page est visible pour économiser des ressources
        if (isPageVisibleRef.current && !isProcessingRef.current) {
          detectPhone();
        }
      }, DETECTION_INTERVAL) as unknown as number;
      
      return () => {
        clearTimeout(initialDetectionTimeout);
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
          console.log('[TF] Arrêt de la détection périodique');
        }
      };
    } else if (!enabled && detectionIntervalRef.current) {
      // Arrêter la détection si désactivée
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
      console.log('[TF] Arrêt de la détection (désactivée)');
    }
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [enabled, model, videoRef, detectPhone]);

  return {
    model,
    phoneDetected,
    phoneDetections,
    isLoading,
    status,
    detectionLogs,
    debugMode,
    toggleDebugMode
  };
}