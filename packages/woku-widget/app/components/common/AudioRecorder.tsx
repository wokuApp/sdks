/**
 * AudioRecorder — ported from woku-review-widget/src/common/AudioRecorder.
 * Icons replaced with lucide-react. Tailwind classes without wrw- prefix.
 */
import { useState, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

interface AudioRecorderProps {
  setAudio: (blob: Blob | undefined) => void;
  mediaRecorder: MediaRecorder | null;
  setMediaRecorder: (r: MediaRecorder | null) => void;
  recording: boolean;
  setRecording: (r: boolean) => void;
}

const AudioRecorder = ({
  setAudio,
  mediaRecorder,
  setMediaRecorder,
  recording,
  setRecording,
}: AudioRecorderProps) => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [time, setTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
  const [isPermission, setIsPermission] = useState(false);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = (): void => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/mp4' });
          setAudioBlob(blob);
        };
        recorder.start();
        setRecording(true);
        setTime(Date.now() - elapsedTime);
        setMediaRecorder(recorder);
      })
      .catch((err) => {
        console.error('Error accessing microphone:', err);
      });
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  useEffect(() => {
    if (audioBlob) {
      setAudioSrc(URL.createObjectURL(audioBlob));
      setAudio(audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsPermission(true);
      } catch {
        setIsPermission(false);
      }
    };
    void requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isPermission) startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPermission]);

  useEffect(() => {
    if (recording) {
      const id = setInterval(() => {
        setElapsedTime(Date.now() - time);
      }, 1000);
      return () => clearInterval(id);
    }
  }, [recording, time]);

  useEffect(() => {
    if (Math.floor(elapsedTime / 1000) >= 60) {
      stopRecording();
      setRecording(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedTime]);

  useEffect(() => {
    if (!recording) stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const elapsed = Math.floor(elapsedTime / 1000);
  const remaining = elapsed === 0 ? '1:00' : `0:${String(60 - (elapsed % 60)).padStart(2, '0')}`;

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-row space-x-2 items-center h-full w-full">
        {recording && (
          <div className="flex items-center w-fit gap-1">
            <Mic className="flex-none text-red-500 h-5 w-5" />
            <div className="w-14 text-center text-sm">{remaining}</div>
          </div>
        )}
        {recording ? (
          <div className="h-4 bg-neutral-200 w-full rounded-full">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all"
              style={{ width: `${(elapsed / 60) * 100}%` }}
            />
          </div>
        ) : isPermission ? (
          <audio controls src={audioSrc} className="w-full h-8" />
        ) : (
          <div className="w-full text-xs font-semibold text-red-500">
            Microphone permission required.
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
