import React from 'react';
import WombatMascot from './WombatMascot';

/**
 * Header de l'application WombatSpeak.
 * Affiche le logo/mascotte, le titre, et les contrôles de langue/difficulté.
 */
export default function Header({
  language,
  onLanguageChange,
  difficulty,
  onDifficultyChange,
  isRunning,
}) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-text-dimmed)]">
      {/* Logo + Titre */}
      <div className="flex items-center gap-3">
        <WombatMascot speaking={isRunning} />
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--color-cyan)' }}>wombat</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>speak</span>
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            voice training
          </p>
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3">
        {/* Sélecteur de langue */}
        <select
          id="language-select"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={isRunning}
          className="select-styled"
          aria-label="Langue"
        >
          <option value="fr">🇫🇷 FR</option>
          <option value="en">🇬🇧 EN</option>
        </select>

        {/* Sélecteur de difficulté */}
        <select
          id="difficulty-select"
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          disabled={isRunning}
          className="select-styled"
          aria-label="Difficulté"
        >
          <option value="all">all</option>
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
      </div>
    </header>
  );
}
