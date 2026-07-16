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
    <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-6 w-full max-w-[1200px] mx-auto gap-4">
      {/* Logo + Titre */}
      <div className="flex items-center gap-3 select-none">
        <WombatMascot speaking={isRunning} />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tighter" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>wombat</span>
            <span style={{ color: 'var(--color-text-primary)' }}>speak</span>
          </h1>
        </div>
      </div>

      {/* Contrôles (Style pill Monkeytype) */}
      <div 
        className="flex items-center rounded-lg px-2 py-1 flex-wrap justify-center gap-y-2" 
        style={{ 
          background: 'var(--color-bg-secondary)', 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.8rem',
          color: 'var(--color-text-muted)'
        }}
      >
        {/* Langue */}
        <div className="flex items-center px-3 gap-2 border-r border-[var(--color-text-dimmed)] min-h-[36px]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isRunning}
            className="bg-transparent border-none outline-none cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
            style={{ color: 'inherit', appearance: 'none', padding: '4px 0' }}
          >
            <option value="fr">french</option>
            <option value="en">english</option>
          </select>
        </div>

        {/* Difficulte */}
        <div className="flex items-center px-3 gap-2 sm:gap-3 min-h-[36px]">
          {['easy', 'medium', 'hard', 'all'].map(diff => (
            <button
              key={diff}
              onClick={() => onDifficultyChange(diff)}
              disabled={isRunning}
              className="hover:text-[var(--color-text-primary)] transition-colors px-1 py-1 sm:px-2"
              style={{ 
                color: difficulty === diff ? 'var(--color-cyan)' : 'inherit',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
