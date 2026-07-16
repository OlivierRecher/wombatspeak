import React, { useRef, useEffect } from 'react';

/**
 * Composant d'affichage du texte avec surlignage dynamique mot par mot.
 * Chaque mot a un statut : pending, active, correct, incorrect.
 */
export default function TextDisplay({ words, wordStatuses, currentIndex }) {
  const containerRef = useRef(null);
  const activeWordRef = useRef(null);

  // Auto-scroll vers le mot actif
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeWordRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // Scroll si le mot actif sort de la zone visible
      if (
        activeRect.top < containerRect.top ||
        activeRect.bottom > containerRect.bottom
      ) {
        active.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentIndex]);

  if (!words || words.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: '200px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Chargement du texte...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      style={{
        maxHeight: '280px',
        padding: '1.5rem',
        borderRadius: '12px',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-text-dimmed)',
        lineHeight: '2.2',
      }}
    >
      {/* Gradient overlay en haut et en bas pour l'effet de fondu */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 z-10"
        style={{
          height: '24px',
          background: 'linear-gradient(to bottom, var(--color-bg-secondary), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
        style={{
          height: '24px',
          background: 'linear-gradient(to top, var(--color-bg-secondary), transparent)',
        }}
      />

      {/* Mots */}
      <div className="relative z-0 py-2">
        {words.map((word, index) => {
          const status = wordStatuses[index] || 'pending';
          const isActive = index === currentIndex;

          return (
            <span
              key={index}
              ref={isActive ? activeWordRef : null}
              className={`word word--${status}${isActive ? ' word--active' : ''}`}
              data-index={index}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
