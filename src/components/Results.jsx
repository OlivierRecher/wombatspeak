import React, { useState } from 'react';
import { normalizeWord, alignWords } from '../utils/textComparison';
import { similarity, MATCH_THRESHOLD } from '../utils/levenshtein';

/**
 * Écran de résultats affiché à la fin d'un exercice.
 * Montre les métriques (WPM, précision) + transcription comparée.
 */
export default function Results({ metrics, words, wordStatuses, spokenWords, onRestart, onNewText }) {
  const [showTranscription, setShowTranscription] = useState(true);

  if (!metrics) return null;

  const { wpm, accuracy, correct, incorrect, total } = metrics;

  // Détermine la couleur de l'accuracy
  const getAccuracyColor = () => {
    if (accuracy >= 90) return 'var(--color-cyan)';
    if (accuracy >= 70) return 'var(--color-warning)';
    return 'var(--color-incorrect)';
  };

  // Message d'encouragement basé sur la performance
  const getMessage = () => {
    if (accuracy >= 95 && wpm >= 120) return '🔥 Incroyable !';
    if (accuracy >= 90) return '✨ Excellente diction !';
    if (accuracy >= 75) return '👍 Bien joué !';
    if (accuracy >= 60) return '💪 Continue comme ça !';
    return '🎯 Entraîne-toi encore !';
  };

  // Construit la comparaison mot par mot avec ce qui a été dit
  const buildTranscription = () => {
    if (!words || !spokenWords) return [];

    // On utilise l'alignement DP pour avoir le résultat final parfait
    const { statuses } = alignWords(words, spokenWords);

    return words.map((expected, i) => ({
      expected,
      spoken: statuses[i].spoken,
      status: statuses[i].status
    }));
  };

  const transcription = buildTranscription();

  return (
    <div className="animate-slide-in" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
      {/* Message */}
      <p
        className="text-center mb-8"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.2rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        {getMessage()}
      </p>

      {/* Stats principales */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-card__value">{wpm}</div>
          <div className="stat-card__label">mots / minute</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value" style={{ color: getAccuracyColor() }}>
            {accuracy}%
          </div>
          <div className="stat-card__label">précision</div>
        </div>
      </div>

      {/* Stats détaillées */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="stat-card">
          <div className="stat-card__value" style={{ fontSize: '1.5rem', color: 'var(--color-cyan)' }}>
            {correct}
          </div>
          <div className="stat-card__label">corrects</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value" style={{ fontSize: '1.5rem', color: 'var(--color-incorrect)' }}>
            {incorrect}
          </div>
          <div className="stat-card__label">erreurs</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value" style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)' }}>
            {total}
          </div>
          <div className="stat-card__label">total</div>
        </div>
      </div>

      {/* Transcription comparée */}
      <div className="mb-8">
        <button
          className="btn-secondary mb-3 w-full justify-center"
          onClick={() => setShowTranscription(!showTranscription)}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <svg
            width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
            style={{
              transform: showTranscription ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          transcription
        </button>

        {showTranscription && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-text-dimmed)',
              borderRadius: '12px',
              padding: '1.25rem',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {/* Texte attendu avec surlignage */}
            <div className="mb-4">
              <div
                className="mb-2"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                texte
              </div>
              <div style={{ lineHeight: '2', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
                {transcription.map((item, i) => (
                  <span
                    key={i}
                    className="transcription-word"
                    style={{
                      display: 'inline-block',
                      margin: '0 3px',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      color:
                        item.status === 'correct' ? 'var(--color-correct)' :
                        item.status === 'incorrect' ? 'var(--color-incorrect)' :
                        'var(--color-text-muted)',
                      background:
                        item.status === 'incorrect' ? 'rgba(255, 64, 96, 0.1)' : 'transparent',
                      textDecoration:
                        item.status === 'incorrect' ? 'underline' : 'none',
                      textDecorationColor: 'var(--color-incorrect)',
                      textUnderlineOffset: '4px',
                    }}
                    title={
                      item.status === 'incorrect' && item.spoken
                        ? `Tu as dit : "${item.spoken}"`
                        : item.status === 'pending'
                        ? 'Non atteint'
                        : undefined
                    }
                  >
                    {item.expected}
                    {/* Tooltip inline pour les erreurs */}
                    {item.status === 'incorrect' && item.spoken && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.65rem',
                          color: 'var(--color-incorrect)',
                          opacity: 0.7,
                          lineHeight: '1',
                          marginTop: '-2px',
                        }}
                      >
                        → {item.spoken}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <button id="btn-restart" className="btn-primary" onClick={onRestart}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
            <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z" />
          </svg>
          recommencer
        </button>
        <button id="btn-new-text" className="btn-secondary" onClick={onNewText}>
          nouveau texte
        </button>
      </div>

      {/* Hint raccourcis */}
      <div
        className="text-center mt-6 desktop-only"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <span className="kbd">tab</span> / <span className="kbd">enter</span> recommencer
        {' • '}
        <span className="kbd">esc</span> nouveau texte
      </div>
    </div>
  );
}
