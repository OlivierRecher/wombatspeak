import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import TextDisplay from './components/TextDisplay';
import VolumeIndicator from './components/VolumeIndicator';
import Results from './components/Results';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { normalizeWord, WordStatus, calculateMetrics, alignWords } from './utils/textComparison';
import { similarity, MATCH_THRESHOLD } from './utils/levenshtein';

// Import des textes bilingues
import frTexts from './texts/fr.json';
import enTexts from './texts/en.json';

const textData = { fr: frTexts, en: enTexts };

/**
 * États de l'application
 */
const AppState = {
  IDLE: 'idle',       // En attente — "appuie sur une touche pour commencer"
  READY: 'ready',     // Micro actif, en attente de la première voix
  RUNNING: 'running', // Timer démarré, exercice en cours
  DONE: 'done',       // Exercice terminé — résultats + transcription
};

/**
 * WombatSpeak — Application principale
 * Orchestre la reconnaissance vocale, l'analyse audio et la logique d'évaluation.
 */
export default function App() {
  // --- État global ---
  const [appState, setAppState] = useState(AppState.IDLE);
  const [language, setLanguage] = useState('fr');
  const [difficulty, setDifficulty] = useState('all');
  const [currentText, setCurrentText] = useState(null);
  const [words, setWords] = useState([]);
  const [wordStatuses, setWordStatuses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [silenceWarning, setSilenceWarning] = useState(false);
  // Stocke les mots prononcés pour la transcription finale
  const [spokenWordsLog, setSpokenWordsLog] = useState([]);

  // Refs pour ne pas recréer les callbacks
  const startTimeRef = useRef(null);
  const timerStartedRef = useRef(false);
  const currentIndexRef = useRef(0);
  const wordStatusesRef = useRef([]);
  const wordsRef = useRef([]);
  const appStateRef = useRef(AppState.IDLE);
  const spokenWordsLogRef = useRef([]);
  const stopListeningRef = useRef(() => {});

  // Synchronise les refs avec l'état
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { wordStatusesRef.current = wordStatuses; }, [wordStatuses]);
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { appStateRef.current = appState; }, [appState]);
  useEffect(() => { spokenWordsLogRef.current = spokenWordsLog; }, [spokenWordsLog]);

  // --- Sélection du texte ---
  const availableTexts = useMemo(() => {
    const data = textData[language];
    if (!data) return [];
    if (difficulty === 'all') return data.texts;
    return data.texts.filter((t) => t.difficulty === difficulty);
  }, [language, difficulty]);

  const selectRandomText = useCallback(() => {
    if (availableTexts.length === 0) return;
    const idx = Math.floor(Math.random() * availableTexts.length);
    const selected = availableTexts[idx];
    setCurrentText(selected);
    // On remplace les tirets par des espaces pour que "au-dessus" devienne deux mots distincts
    // Cela rend la reconnaissance vocale beaucoup plus tolérante
    const textWords = selected.words.replace(/-/g, ' ').split(/\s+/);
    setWords(textWords);
    setWordStatuses(textWords.map(() => WordStatus.PENDING));
    setCurrentIndex(0);
    setSpokenWordsLog([]);
  }, [availableTexts]);

  // Sélectionne un texte initial
  useEffect(() => {
    selectRandomText();
  }, [language, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Callback de silence ---
  const handleSilenceDetected = useCallback(() => {
    if (appStateRef.current === AppState.RUNNING) {
      setSilenceWarning(true);
      setTimeout(() => setSilenceWarning(false), 2000);
    }
  }, []);

  // --- Audio Analyzer ---
  const {
    volume,
    isSilent,
    startAnalyzer,
    stopAnalyzer,
  } = useAudioAnalyzer({
    silenceThreshold: 15,
    silenceDurationMs: 4000,
    onSilenceDetected: handleSilenceDetected,
  });

  // --- Fin de l'exercice ---
  const finishExercise = useCallback(() => {
    if (!timerStartedRef.current) {
      // Timer never started — no voice detected, just reset
      setAppState(AppState.IDLE);
      stopAnalyzer();
      stopListeningRef.current();
      return;
    }
    const elapsed = Date.now() - startTimeRef.current;
    const results = wordsRef.current.map((word, i) => ({
      word,
      status: wordStatusesRef.current[i] || WordStatus.PENDING,
    }));
    const m = calculateMetrics(results, elapsed);
    setMetrics(m);
    setAppState(AppState.DONE);
    stopAnalyzer();
    stopListeningRef.current();
  }, [stopAnalyzer]);

  // --- Callback de mise à jour globale (interim + final) ---
  const updateAlignment = useCallback((allText, isFinalChunk = false) => {
    // Tolérance : on sépare les mots liés par des tirets
    const allWords = allText
      .replace(/-/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (allWords.length === 0) return;

    // Démarrer le timer au premier son de voix
    if (!timerStartedRef.current) {
      timerStartedRef.current = true;
      startTimeRef.current = Date.now();
      setAppState(AppState.RUNNING);
    }

    const expectedWords = wordsRef.current;
    
    // On utilise notre nouvel algorithme DP pour trouver l'alignement parfait
    const { statuses, currentIndex: newIdx } = alignWords(expectedWords, allWords);
    
    // Convertir les statuts d'objets complets vers un simple tableau de strings 
    const newWordStatuses = statuses.map((s, i) => {
      // Évite le clignotement rouge sur les mots en cours de prononciation (interim)
      if (!isFinalChunk && s.status === WordStatus.INCORRECT) {
        // Si c'est l'un des 2 derniers mots atteints, on le remet en PENDING
        // pour ne pas afficher l'erreur prématurément ni dupliquer le curseur ACTIVE
        if (i >= newIdx - 2) {
          return WordStatus.PENDING;
        }
      }
      return s.status;
    });
    
    setWordStatuses(newWordStatuses);
    setCurrentIndex(newIdx);

    // On sauvegarde toujours l'ensemble des mots prononcés pour la vue Results
    setSpokenWordsLog(allWords);

    // Vérifie si l'exercice est terminé (si on a atteint ou dépassé la fin)
    if (newIdx >= expectedWords.length) {
      setTimeout(() => finishExercise(), 300);
    }
  }, [finishExercise]);

  // --- Callback pour les résultats finaux ---
  const handleSpeechResult = useCallback((finalText) => {
    updateAlignment(finalText, true);
  }, [updateAlignment]);

  // --- Callback pour la mise à jour interim (surlignage rapide) ---
  const handleInterimUpdate = useCallback((allText) => {
    // onInterimUpdate nous donne DEJA tout le texte (accumulated finals + current interim)
    // On l'utilise pour le surlignage en temps réel sans affecter le log final
    updateAlignment(allText, false);
  }, [updateAlignment]);

  // --- Speech Recognition ---
  const langCode = textData[language]?.code || 'fr-FR';

  const {
    isListening,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: langCode,
    continuous: true,
    interimResults: true,
    onResult: handleSpeechResult,
    onInterimUpdate: handleInterimUpdate,
    onEnd: () => {},
    onError: (error) => {
      console.warn('Speech error:', error);
    },
  });

  // Assigne la fonction à la ref pour éviter les dépendances circulaires
  stopListeningRef.current = stopListening;

  // --- Démarrage de l'exercice (appel micro, attente voix) ---
  const startExercise = useCallback(async () => {
    // Reset état
    const textWords = wordsRef.current;
    setWordStatuses(textWords.map(() => WordStatus.PENDING));
    setCurrentIndex(0);
    setMetrics(null);
    setSpokenWordsLog([]);
    timerStartedRef.current = false;
    startTimeRef.current = null;

    // Passe en mode READY (micro actif, en attente de voix)
    setAppState(AppState.READY);

    // Démarre l'analyse audio et la reconnaissance vocale
    await startAnalyzer();
    startListening();
  }, [startAnalyzer, startListening]);

  // --- Arrêt de l'exercice ---
  const stopExercise = useCallback(() => {
    stopListening();
    finishExercise();
  }, [stopListening, finishExercise]);

  // --- Restart avec le même texte (directement en mode écoute, pas besoin de recliquer) ---
  const handleRestart = useCallback(async () => {
    stopListening();
    stopAnalyzer();

    // Reset tout et relance directement
    const textWords = wordsRef.current;
    setWordStatuses(textWords.map(() => WordStatus.PENDING));
    setCurrentIndex(0);
    setMetrics(null);
    setSpokenWordsLog([]);
    timerStartedRef.current = false;
    startTimeRef.current = null;

    // Passe directement en READY → attend la voix
    setAppState(AppState.READY);

    await startAnalyzer();
    startListening();
  }, [stopListening, stopAnalyzer, startAnalyzer, startListening]);

  // --- Nouveau texte ---
  const handleNewText = useCallback(async () => {
    stopListening();
    stopAnalyzer();
    setMetrics(null);
    setSpokenWordsLog([]);
    selectRandomText();
    setAppState(AppState.IDLE);
  }, [stopListening, stopAnalyzer, selectRandomText]);

  // --- Changement de langue ---
  const handleLanguageChange = useCallback((lang) => {
    setLanguage(lang);
    setAppState(AppState.IDLE);
    setMetrics(null);
  }, []);

  // --- Changement de difficulté ---
  const handleDifficultyChange = useCallback((diff) => {
    setDifficulty(diff);
    setAppState(AppState.IDLE);
    setMetrics(null);
  }, []);

  // --- Raccourcis clavier ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = appStateRef.current;
      const tag = e.target.tagName;

      // Ignore si on est dans un input/select
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (state === AppState.IDLE) {
        // N'importe quelle touche pour commencer
        if (e.key === 'Tab') {
           e.preventDefault();
           handleNewText();
        } else {
           e.preventDefault();
           startExercise();
        }
      } else if (state === AppState.DONE) {
        if (e.key === 'Tab') {
          // Tab → nouveau texte
          e.preventDefault();
          handleNewText();
        } else if (e.key === 'Enter') {
          // Enter → recommencer le même texte
          e.preventDefault();
          handleRestart();
        } else if (e.key === 'Escape') {
          // Escape → nouveau texte
          e.preventDefault();
          handleNewText();
        }
      } else if (state === AppState.RUNNING || state === AppState.READY) {
        if (e.key === 'Escape') {
          // Escape → arrêter l'exercice
          e.preventDefault();
          stopExercise();
        } else if (e.key === 'Tab') {
          // Tab → nouveau texte direct
          e.preventDefault();
          handleNewText();
        } else if (e.key === 'Enter') {
          // Enter → restart direct
          e.preventDefault();
          handleRestart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startExercise, handleRestart, handleNewText, stopExercise]);

  // --- Rendu ---
  const isActive = appState === AppState.RUNNING || appState === AppState.READY;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
        isRunning={isActive}
      />

      {/* Contenu principal */}
      <main 
        className="flex-1 flex flex-col items-center justify-center px-4 py-8" 
        style={{ 
          maxWidth: '1000px', 
          margin: '0 auto', 
          width: '100%',
          cursor: appState === AppState.IDLE ? 'pointer' : 'default' 
        }}
        onClick={() => {
          if (appState === AppState.IDLE) {
            startExercise();
          }
        }}
      >

        {/* Zone de texte */}
        {appState !== AppState.DONE && (
          <div className="w-full mb-8 relative">
            
            {/* Titre / Info au dessus du texte (discret) */}
            {currentText && appState === AppState.IDLE && (
              <div 
                className="absolute -top-8 left-0 right-0 text-center animate-fade-in"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
              >
                {currentText.title} • {currentText.difficulty}
              </div>
            )}

            <TextDisplay
              words={words}
              wordStatuses={wordStatuses}
              currentIndex={isActive ? currentIndex : -1}
            />

            {/* Tap to start indicator */}
            {appState === AppState.IDLE && (
              <div className="flex justify-center mt-12 animate-pulse mobile-only" style={{ color: 'var(--color-text-muted)' }}>
                <div className="flex flex-col items-center gap-2">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span className="text-center px-4" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {language === 'fr' ? 'Appuie sur l\'écran ou sur une touche pour commencer' : 'Tap screen or press any key to start'}
                  </span>
                </div>
              </div>
            )}

            {/* Controls (en dessous du texte, centrés) */}
            {(appState === AppState.RUNNING || appState === AppState.READY) && (
              <div className="flex justify-center gap-6 mt-12 animate-fade-in">
                {/* Stop button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); stopExercise(); }}
                  className="control-btn hover:text-[var(--color-incorrect)]"
                  title="Stop (Esc)"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="6" width="12" height="12" rx="2" ry="2"/>
                  </svg>
                </button>

                {/* Restart button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRestart(); }}
                  className="control-btn hover:text-[var(--color-text-primary)]"
                  title="Restart (Enter)"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>

                {/* Skip / Next button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNewText(); }}
                  className="control-btn hover:text-[var(--color-text-primary)]"
                  title="Next Text (Tab)"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 4l10 8-10 8V4z" />
                    <path d="M19 4v16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Avertissement silence */}
        {silenceWarning && appState === AppState.RUNNING && (
          <div
            className="text-center py-2 px-4 rounded-lg mb-4 animate-fade-in"
            style={{
              background: 'rgba(255, 170, 0, 0.1)',
              border: '1px solid rgba(255, 170, 0, 0.3)',
              color: 'var(--color-warning)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
            }}
          >
            🎤 Silence détecté — continue à parler !
          </div>
        )}

        {/* Résultats */}
        {appState === AppState.DONE && (
          <Results
            metrics={metrics}
            words={words}
            wordStatuses={wordStatuses}
            spokenWords={spokenWordsLog}
            onRestart={handleRestart}
            onNewText={handleNewText}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        className="text-center py-4 px-4 desktop-only"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-text-dimmed)',
        }}
      >
        <span style={{ color: 'var(--color-cyan)', opacity: 0.5 }}>wombatspeak</span>
        {' '}— open source voice training •{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>
          {appState === AppState.DONE ? (
            <>
              <span className="kbd">tab</span> / <span className="kbd">enter</span> recommencer • <span className="kbd">esc</span> nouveau texte
            </>
          ) : appState === AppState.IDLE ? (
            <>any key to start</>
          ) : (
            <>
              <span className="kbd">tab</span> next • <span className="kbd">enter</span> restart • <span className="kbd">esc</span> stop
            </>
          )}
        </span>
      </footer>
    </div>
  );
}
