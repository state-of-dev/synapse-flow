import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type RecordingState = 'idle' | 'recording' | 'transcribing';

export function useAudioRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');

  const startRecording = useCallback(async () => {
    try {
      // Verificar permisos primero
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Tu navegador no soporta grabación de audio');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      // Detectar el mejor formato soportado por el navegador
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      chunksRef.current = [];
      mimeTypeRef.current = mimeType; // Guardar el mimeType usado

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecordingState('recording');
    } catch (error: any) {
      console.error('Error al iniciar grabación:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Permiso de micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No se encontró ningún micrófono en tu dispositivo.');
      } else if (error.name === 'NotReadableError') {
        toast.error('El micrófono ya está siendo usado por otra aplicación.');
      } else {
        toast.error('No se pudo acceder al micrófono. Intenta recargar la página.');
      }
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No hay grabación activa'));
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });

        // Detener todos los tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setRecordingState('idle');

        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    setRecordingState('transcribing');

    try {
      const formData = new FormData();

      // Determinar extensión de archivo basada en el tipo MIME
      let filename = 'audio.webm';
      if (audioBlob.type.includes('mp4')) {
        filename = 'audio.mp4';
      } else if (audioBlob.type.includes('aac')) {
        filename = 'audio.aac';
      } else if (audioBlob.type.includes('mpeg')) {
        filename = 'audio.mp3';
      }

      formData.append('file', audioBlob, filename);

      const response = await fetch('/api/groq/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al transcribir');
      }

      const data = await response.json();
      setRecordingState('idle');

      return data.text;
    } catch (error) {
      setRecordingState('idle');
      console.error('Error en transcripción:', error);
      toast.error('Error al transcribir el audio');
      throw error;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setRecordingState('idle');
    }
  }, []);

  return {
    recordingState,
    startRecording,
    stopRecording,
    transcribeAudio,
    cancelRecording,
    isRecording: recordingState === 'recording',
    isTranscribing: recordingState === 'transcribing',
  };
}
