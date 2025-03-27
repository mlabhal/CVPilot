// src/components/quiz/DebugPanel.tsx
import React from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface DebugPanelProps {
  visible: boolean;
  status: string;
  model: cocoSsd.ObjectDetection | null;
  cameraActive: boolean;
  phoneDetected: boolean;
  phoneDetections: number;
  detectionLogs: Array<{time: Date, objects: any[]}>;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  visible,
  status,
  model,
  cameraActive,
  phoneDetected,
  phoneDetections,
  detectionLogs
}) => {
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-0 left-0 w-full bg-black bg-opacity-80 text-white p-4 z-50 max-h-80 overflow-auto">
      <h3 className="text-lg font-bold">Mode Débogage TensorFlow</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Modèle chargé:</strong> {model ? 'Oui' : 'Non'}</p>
          <p><strong>Caméra active:</strong> {cameraActive ? 'Oui' : 'Non'}</p>
          <p><strong>Téléphone détecté:</strong> {phoneDetected ? 'Oui' : 'Non'}</p>
          <p><strong>Nombre de détections:</strong> {phoneDetections}</p>
        </div>
        <div>
          <p className="font-bold">Logs de détection récents:</p>
          <div className="text-xs">
            {detectionLogs.map((log, index) => (
              <div key={index} className="mb-1 border-b border-gray-600 pb-1">
                <p>{log.time.toLocaleTimeString()} - {log.objects.length} objets</p>
                {log.objects.map((obj: any, i: number) => (
                  <p key={i} className={obj.class === 'cell phone' ? 'text-red-400' : ''}>
                    {obj.class}: {(obj.score * 100).toFixed(2)}%
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;