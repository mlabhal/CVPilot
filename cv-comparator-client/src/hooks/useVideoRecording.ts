// src/hooks/useVideoRecording.ts
import { useState, useRef, useEffect, useCallback } from 'react';

interface VideoRecordingOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  mediaStream?: () => MediaStream | null; // Fonction pour récupérer le flux média
  enabled: boolean;
  onError?: (message: string) => void;
  maxDuration?: number; // En secondes
  mimeType?: string;
}

export const useVideoRecording = ({
  videoRef,
  mediaStream,
  enabled,
  onError,
  maxDuration = 3600, // 1 heure par défaut
  mimeType = 'video/webm;codecs=vp9'
}: VideoRecordingOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Fonction pour obtenir le flux média à partir de différentes sources
  const getMediaStream = useCallback((): MediaStream | null => {
    // 1. Utiliser la fonction mediaStream si fournie
    if (mediaStream) {
      const stream = mediaStream();
      if (stream) return stream;
    }
    
    // 2. Tenter de récupérer depuis videoRef.srcObject
    if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
      return videoRef.current.srcObject as MediaStream;
    }
    
    // 3. Aucun flux disponible
    return null;
  }, [videoRef, mediaStream]);

  // Nettoyer la référence de l'enregistreur
  const cleanupRecorder = useCallback(() => {
    if (recorderRef.current) {
      if (recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch (err) {
          console.warn('Erreur lors de l\'arrêt forcé de l\'enregistreur:', err);
        }
      }
      recorderRef.current = null;
    }
    
    // Nettoyer le timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Arrêter l'enregistrement
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive') {
        setIsRecording(false);
        resolve(recordedBlob);
        return;
      }
      
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setIsRecording(false);
        
        // Nettoyer le timer
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        console.log(`Enregistrement arrêté: ${blob.size} octets`);
        resolve(blob);
      };
      
      try {
        recorderRef.current.stop();
      } catch (err) {
        console.error('Erreur lors de l\'arrêt de l\'enregistrement:', err);
        setIsRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        resolve(recordedBlob);
      }
    });
  }, [recordedBlob, mimeType]);

  // Démarrer l'enregistrement
  const startRecording = useCallback((directStream?: MediaStream) => {
    if (isRecording) return;
    
    // Nettoyer tout enregistrement précédent
    cleanupRecorder();
    
    try {
      // Utiliser le flux direct si fourni, sinon obtenir le flux via getMediaStream
      const stream = directStream || getMediaStream();
      
      if (!stream) {
        const errorMsg = 'Flux média non disponible pour l\'enregistrement';
        console.error(errorMsg);
        onError?.(errorMsg);
        return;
      }
      
      // Vérifier que le flux a des pistes vidéo actives
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0 || videoTracks[0].readyState !== 'live') {
        const errorMsg = 'Aucune piste vidéo active disponible';
        console.error(errorMsg);
        onError?.(errorMsg);
        return;
      }
      
      // Vérifier le support du type MIME
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`Le type MIME ${mimeType} n'est pas supporté, utilisation du type par défaut`);
      }
      
      // Créer un nouvel enregistreur
      const recorder = new MediaRecorder(stream, { 
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm' 
      });
      
      // Initialiser le tableau de chunks
      chunksRef.current = [];
      
      // Configurer les gestionnaires d'événements
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.onerror = (event) => {
        console.error('Erreur d\'enregistrement:', event);
        onError?.(`Erreur d'enregistrement: ${event}`);
        cleanupRecorder();
      };
      
      // Démarrer l'enregistrement
      recorder.start(1000); // Chunk toutes les secondes
      recorderRef.current = recorder;
      
      // Configurer le compteur de temps
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      setIsRecording(true);
      console.log('Enregistrement démarré');
      
    } catch (err) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', err);
      onError?.(`Erreur de démarrage d'enregistrement: ${err instanceof Error ? err.message : String(err)}`);
      cleanupRecorder();
    }
  }, [isRecording, cleanupRecorder, getMediaStream, onError, stopRecording, maxDuration, mimeType]);

  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      cleanupRecorder();
    };
  }, [cleanupRecorder]);

  // Arrêter l'enregistrement si la composante est désactivée
  useEffect(() => {
    if (!enabled && isRecording) {
      stopRecording();
    }
  }, [enabled, isRecording, stopRecording]);

  return {
    isRecording,
    recordingTime,
    recordedBlob,
    startRecording,
    stopRecording
  };
};