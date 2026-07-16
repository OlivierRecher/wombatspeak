import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook personnalisé pour la reconnaissance vocale via la Web Speech API.
 * Architecture prête pour une future intégration de Transformers.js (Whisper Web).
 * 
 * @param {Object} options
 * @param {string} options.lang - Code langue (ex: 'fr-FR', 'en-US')
 * @param {boolean} options.continuous - Mode continu
 * @param {boolean} options.interimResults - Résultats intermédiaires
 * @param {function} options.onResult - Callback appelé avec les mots transcrits
 * @param {function} options.onEnd - Callback appelé quand la reconnaissance s'arrête
 * @param {function} options.onError - Callback appelé en cas d'erreur
 */
export function useSpeechRecognition({
  lang = 'fr-FR',
  continuous = true,
  interimResults = true,
  onResult,
  onEnd,
  onError,
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);

  // Vérifie le support de la Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Initialise l'instance de reconnaissance vocale
  const initRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalText += text + ' ';
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
        onResult?.(finalText.trim());
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(event.error);
      }
    };

    recognition.onend = () => {
      // Redémarrage automatique en mode continu si on n'a pas demandé l'arrêt
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Failed to restart recognition:', e);
          setIsListening(false);
          shouldRestartRef.current = false;
          onEnd?.();
        }
      } else {
        setIsListening(false);
        onEnd?.();
      }
    };

    return recognition;
  }, [lang, continuous, interimResults, onResult, onEnd, onError]);

  // Démarre la reconnaissance vocale
  const startListening = useCallback(() => {
    // Arrête l'instance précédente si elle existe
    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      try {
        recognitionRef.current.abort();
      } catch (e) { /* ignore */ }
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    setTranscript('');
    setInterimTranscript('');

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsListening(false);
    }
  }, [initRecognition]);

  // Arrête la reconnaissance vocale
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) { /* ignore */ }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
  };
}
