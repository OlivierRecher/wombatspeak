import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook personnalisé pour l'analyse audio en temps réel via la Web Audio API.
 * Détecte le volume, les silences prolongés et visualise l'activité vocale.
 *
 * @param {Object} options
 * @param {number} options.silenceThreshold - Seuil de volume en dessous duquel on considère un silence (0-255)
 * @param {number} options.silenceDurationMs - Durée en ms avant de considérer un silence trop long
 * @param {function} options.onSilenceDetected - Callback quand un silence trop long est détecté
 */
export function useAudioAnalyzer({
  silenceThreshold = 15,
  silenceDurationMs = 3000,
  onSilenceDetected,
} = {}) {
  const [volume, setVolume] = useState(0);
  const [isSilent, setIsSilent] = useState(true);
  const [stream, setStream] = useState(null);

  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const silenceStartRef = useRef(null);
  const isActiveRef = useRef(false);

  // Démarre la capture et l'analyse audio
  const startAnalyzer = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyzer);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
      sourceRef.current = source;
      isActiveRef.current = true;
      setStream(mediaStream);

      // Boucle d'analyse
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const analyze = () => {
        if (!isActiveRef.current) return;

        analyzer.getByteFrequencyData(dataArray);

        // Calcule le volume moyen
        const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setVolume(Math.round(avg));

        // Détection de silence
        if (avg < silenceThreshold) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > silenceDurationMs) {
            setIsSilent(true);
            onSilenceDetected?.();
            silenceStartRef.current = Date.now(); // Reset pour ne pas spam
          }
          if (!isSilent) setIsSilent(true);
        } else {
          silenceStartRef.current = null;
          setIsSilent(false);
        }

        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      analyze();
    } catch (err) {
      console.error('Failed to start audio analyzer:', err);
    }
  }, [silenceThreshold, silenceDurationMs, onSilenceDetected]);

  // Arrête l'analyse audio et libère les ressources
  const stopAnalyzer = useCallback(() => {
    isActiveRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setVolume(0);
    setIsSilent(true);
    setStream(null);
  }, [stream]);

  // Nettoyage
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch(e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch(e) {}
      }
    };
  }, []);

  return {
    volume,
    isSilent,
    stream,
    startAnalyzer,
    stopAnalyzer,
  };
}
