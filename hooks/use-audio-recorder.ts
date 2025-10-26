import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type RecordingState = 'idle' | 'recording' | 'transcribing';

export function useAudioRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecordingState('recording');
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      toast.error('No se pudo acceder al micrófono');
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
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

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
      formData.append('file', audioBlob, 'audio.webm');

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
