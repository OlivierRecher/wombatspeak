import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook personnalisé pour la reconnaissance vocale via la Web Speech API.
 * Architecture prête pour une future intégration de Transformers.js (Whisper Web).
 *
 * @param {Object} options
 * @param {string} options.lang - Code langue (ex: 'fr-FR', 'en-US')
 * @param {boolean} options.continuous - Mode continu
 * @param {boolean} options.interimResults - Résultats intermédiaires
 * @param {function} options.onResult - Callback appelé avec les mots finaux transcrits
 * @param {function} options.onInterimUpdate - Callback appelé avec TOUS les mots (finals + interim) pour mise à jour rapide
 * @param {function} options.onEnd - Callback appelé quand la reconnaissance s'arrête
 * @param {function} options.onError - Callback appelé en cas d'erreur
 */
export function useSpeechRecognition({
  lang = 'fr-FR',
  continuous = true,
  interimResults = true,
  onResult,
  onInterimUpdate,
  onEnd,
  onError,
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  // Track all accumulated final text across restarts
  const accumulatedFinalRef = useRef('');
  const lastEndRef = useRef(0);

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
      // Isoler strictement les sessions : ignorer les événements fantômes d'anciennes sessions
      if (recognitionRef.current !== recognition) {
        return;
      }

      let sessionFinal = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          sessionFinal += text + ' ';
        } else {
          interimText += text;
        }
      }

      // sessionFinal contient TOUS les résultats finaux de la session courante (depuis le dernier start)
      // On l'écrase, on ne l'ajoute pas à lui-même
      recognition._sessionFinals = sessionFinal;
      
      const allFinal = accumulatedFinalRef.current + sessionFinal;
      setTranscript(allFinal);
      setInterimTranscript(interimText);

      // On envoie le texte final complet à App.jsx
      if (sessionFinal) {
        onResult?.(allFinal.trim());
      }

      // Appelle onInterimUpdate avec tous les mots (finals + interim courant)
      // pour une mise à jour plus rapide du surlignage
      const allText = (allFinal + interimText).trim();
      if (allText) {
        onInterimUpdate?.(allText);
      }
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) {
        return;
      }
      console.warn('Speech recognition error:', event.error);
      
      // Stop restarting on critical errors
      if (event.error === 'not-allowed' || event.error === 'audio-capture' || event.error === 'service-not-allowed') {
        shouldRestartRef.current = false;
      }

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(event.error);
      }
    };

    recognition.onend = () => {
      // Ignorer si ce n'est plus l'instance active (évite les fantômes après un abort)
      if (recognitionRef.current !== recognition) {
        return;
      }

      // Redémarrage automatique en mode continu si on n'a pas demandé l'arrêt
      if (shouldRestartRef.current) {
        
        // Anti-infinite loop: if onend fires multiple times within 100ms, abort
        const now = Date.now();
        if (now - lastEndRef.current < 100) {
          console.error('Speech API infinite loop detected. Stopping restart.');
          shouldRestartRef.current = false;
          setIsListening(false);
          return;
        }
        lastEndRef.current = now;

        // Accumulate this session's finals before restarting
        accumulatedFinalRef.current += (recognition._sessionFinals || '');
        recognition._sessionFinals = '';
        
        // Add a small delay for mobile browsers (helps with iOS Safari gesture requirements)
        setTimeout(() => {
          if (!shouldRestartRef.current || recognitionRef.current !== recognition) return;
          try {
            recognition.start();
          } catch (e) {
            console.warn('Failed to restart recognition:', e);
            setIsListening(false);
            shouldRestartRef.current = false;
            onEnd?.();
          }
        }, 50);

      } else {
        setIsListening(false);
        onEnd?.();
      }
    };

    return recognition;
  }, [lang, continuous, interimResults, onResult, onInterimUpdate, onEnd, onError]);

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
    accumulatedFinalRef.current = '';
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
