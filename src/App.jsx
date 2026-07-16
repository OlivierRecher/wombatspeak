import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import TextDisplay from './components/TextDisplay';
import VolumeIndicator from './components/VolumeIndicator';
import Results from './components/Results';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { normalizeWord, WordStatus, calculateMetrics } from './utils/textComparison';
import { similarity, MATCH_THRESHOLD } from './utils/levenshtein';

// Import des textes bilingues
import frTexts from './texts/fr.json';
import enTexts from './texts/en.json';

const textData = { fr: frTexts, en: enTexts };

/**
 * États de l'application
 */
const AppState = {
  IDLE: 'idle',       // En attente de démarrage
  RUNNING: 'running', // Exercice en cours
  DONE: 'done',       // Exercice terminé
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
  const [countdown, setCountdown] = useState(null);

  // Refs pour ne pas recréer les callbacks
  const startTimeRef = useRef(null);
  const currentIndexRef = useRef(0);
  const wordStatusesRef = useRef([]);
  const wordsRef = useRef([]);

  // Synchronise les refs avec l'état
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { wordStatusesRef.current = wordStatuses; }, [wordStatuses]);
  useEffect(() => { wordsRef.current = words; }, [words]);

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
    const textWords = selected.words.split(/\s+/);
    setWords(textWords);
    setWordStatuses(textWords.map(() => WordStatus.PENDING));
    setCurrentIndex(0);
  }, [availableTexts]);

  // Sélectionne un texte initial
  useEffect(() => {
    selectRandomText();
  }, [language, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Callback de silence ---
  const handleSilenceDetected = useCallback(() => {
    if (appState === 'running') {
      setSilenceWarning(true);
      setTimeout(() => setSilenceWarning(false), 2000);
    }
  }, [appState]);

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
    const elapsed = Date.now() - startTimeRef.current;
    const results = wordsRef.current.map((word, i) => ({
      word,
      status: wordStatusesRef.current[i] || WordStatus.PENDING,
    }));
    const m = calculateMetrics(results, elapsed);
    setMetrics(m);
    setAppState(AppState.DONE);
    stopAnalyzer();
  }, [stopAnalyzer]);

  // --- Callback de résultat vocal ---
  const handleSpeechResult = useCallback((finalText) => {
    const spokenWords = finalText
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (spokenWords.length === 0) return;

    let idx = currentIndexRef.current;
    const statuses = [...wordStatusesRef.current];
    const expectedWords = wordsRef.current;

    for (let i = 0; i < spokenWords.length && idx < expectedWords.length; i++) {
      const expected = normalizeWord(expectedWords[idx]);
      const spoken = normalizeWord(spokenWords[i]);

      if (!spoken) continue;

      const score = similarity(expected, spoken);

      if (score >= MATCH_THRESHOLD) {
        statuses[idx] = WordStatus.CORRECT;
        idx++;
      } else {
        // Vérifie si le mot parlé correspond au mot SUIVANT (skip detection)
        if (idx + 1 < expectedWords.length) {
          const nextExpected = normalizeWord(expectedWords[idx + 1]);
          const nextScore = similarity(nextExpected, spoken);
          if (nextScore >= MATCH_THRESHOLD) {
            statuses[idx] = WordStatus.INCORRECT;
            idx++;
            statuses[idx] = WordStatus.CORRECT;
            idx++;
            continue;
          }
        }
        statuses[idx] = WordStatus.INCORRECT;
        idx++;
      }
    }

    setWordStatuses(statuses);
    setCurrentIndex(idx);

    // Vérifie si l'exercice est terminé
    if (idx >= expectedWords.length) {
      // Petit délai pour l'animation du dernier mot
      setTimeout(() => finishExercise(), 300);
    }
  }, [finishExercise]);

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
    onEnd: () => {
      // Si l'exercice est encore en cours et que la reconnaissance s'arrête
      // sans avoir terminé, ne pas finir l'exercice
    },
    onError: (error) => {
      console.warn('Speech error:', error);
    },
  });

  // --- Démarrage de l'exercice ---
  const startExercise = useCallback(async () => {
    // Countdown 3-2-1
    setCountdown(3);
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 700));
    }
    setCountdown(null);

    // Reset état
    const textWords = words.length > 0 ? words : [];
    setWordStatuses(textWords.map(() => WordStatus.PENDING));
    setCurrentIndex(0);
    setMetrics(null);
    startTimeRef.current = Date.now();
    setAppState(AppState.RUNNING);

    // Démarre l'analyse audio et la reconnaissance vocale
    await startAnalyzer();
    startListening();
  }, [words, startAnalyzer, startListening]);

  // --- Arrêt de l'exercice ---
  const stopExercise = useCallback(() => {
    stopListening();
    finishExercise();
  }, [stopListening, finishExercise]);

  // --- Restart avec le même texte ---
  const handleRestart = useCallback(() => {
    stopListening();
    stopAnalyzer();
    setAppState(AppState.IDLE);
    setMetrics(null);
    const textWords = words;
    setWordStatuses(textWords.map(() => WordStatus.PENDING));
    setCurrentIndex(0);
  }, [words, stopListening, stopAnalyzer]);

  // --- Nouveau texte ---
  const handleNewText = useCallback(() => {
    stopListening();
    stopAnalyzer();
    setAppState(AppState.IDLE);
    setMetrics(null);
    selectRandomText();
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

  // --- Rendu ---
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
        isRunning={appState === AppState.RUNNING}
      />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8" style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>

        {/* Titre du texte */}
        {currentText && appState !== AppState.DONE && (
          <div className="mb-4 text-center animate-fade-in">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-text-dimmed)',
              }}
            >
              {currentText.title}
              <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>
                • {currentText.difficulty}
              </span>
            </span>
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(10, 10, 15, 0.85)' }}
          >
            <span
              className="animate-fade-in"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '6rem',
                fontWeight: 700,
                color: 'var(--color-cyan)',
                textShadow: '0 0 40px var(--color-cyan-glow)',
              }}
            >
              {countdown}
            </span>
          </div>
        )}

        {/* Zone de texte */}
        {appState !== AppState.DONE && (
          <div className="w-full mb-6">
            <TextDisplay
              words={words}
              wordStatuses={wordStatuses}
              currentIndex={appState === AppState.RUNNING ? currentIndex : -1}
            />
          </div>
        )}

        {/* Barre de contrôle (idle ou running) */}
        {appState !== AppState.DONE && (
          <div className="flex items-center justify-between w-full mb-6 animate-fade-in">
            {/* Volume indicator */}
            <VolumeIndicator
              volume={volume}
              isSilent={isSilent}
              isActive={appState === AppState.RUNNING}
            />

            {/* Bouton central */}
            <div className="flex items-center gap-3">
              {appState === AppState.IDLE && (
                <>
                  {!isSupported ? (
                    <div
                      className="text-sm px-4 py-2 rounded-lg"
                      style={{
                        color: 'var(--color-incorrect)',
                        background: 'var(--color-incorrect-glow)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      ⚠ Web Speech API non supportée par votre navigateur
                    </div>
                  ) : (
                    <button
                      id="btn-start"
                      className="btn-primary"
                      onClick={startExercise}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1a2 2 0 0 0-2 2v4a2 2 0 1 0 4 0V3a2 2 0 0 0-2-2Z" />
                        <path d="M4 6.5a.5.5 0 0 0-1 0v.5A5 5 0 0 0 7.5 12v2.5h-2a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-2V12A5 5 0 0 0 13 7V6.5a.5.5 0 0 0-1 0V7a4 4 0 0 1-8 0v-.5Z" />
                      </svg>
                      commencer
                    </button>
                  )}
                </>
              )}

              {appState === AppState.RUNNING && (
                <button
                  id="btn-stop"
                  className="btn-primary btn-primary--recording"
                  onClick={stopExercise}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="3" y="3" width="10" height="10" rx="1" />
                  </svg>
                  arrêter
                </button>
              )}
            </div>

            {/* Compteur de progression */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              {appState === AppState.RUNNING && (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-cyan)' }}>{currentIndex}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}> / {words.length}</span>
                </span>
              )}
            </div>
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

        {/* Transcription en cours (interim) */}
        {appState === AppState.RUNNING && interimTranscript && (
          <div
            className="text-center mt-2 animate-fade-in"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
            }}
          >
            {interimTranscript}
          </div>
        )}

        {/* Résultats */}
        {appState === AppState.DONE && (
          <Results
            metrics={metrics}
            onRestart={handleRestart}
            onNewText={handleNewText}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        className="text-center py-4 px-4"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-text-dimmed)',
        }}
      >
        <span style={{ color: 'var(--color-cyan)', opacity: 0.5 }}>wombatspeak</span>
        {' '}— open source voice training •{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>100% client-side</span>
      </footer>
    </div>
  );
}
