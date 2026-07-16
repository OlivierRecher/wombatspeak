import React, { useMemo } from 'react';

/**
 * Indicateur visuel du volume micro en temps réel.
 * Affiche une barre de type waveform avec des segments animés.
 * @param {Object} props
 * @param {number} props.volume - Volume actuel (0-255)
 * @param {boolean} props.isSilent - Si le micro est en silence
 * @param {boolean} props.isActive - Si l'indicateur est actif
 */
export default function VolumeIndicator({ volume = 0, isSilent = true, isActive = false }) {
  const segments = 12;

  // Génère les hauteurs des segments basées sur le volume
  const heights = useMemo(() => {
    if (!isActive) return Array(segments).fill(2);

    return Array.from({ length: segments }, (_, i) => {
      const center = segments / 2;
      const distFromCenter = Math.abs(i - center) / center;
      const baseHeight = Math.max(2, (volume / 255) * 24 * (1 - distFromCenter * 0.5));
      // Ajouter un peu de variation
      const variation = Math.sin(Date.now() / 200 + i * 0.8) * 3;
      return Math.max(2, Math.min(24, baseHeight + (isActive && !isSilent ? variation : 0)));
    });
  }, [volume, isSilent, isActive]);

  return (
    <div className="flex items-center gap-2">
      {/* Icône micro */}
      <svg
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        style={{ color: isActive && !isSilent ? 'var(--color-cyan)' : 'var(--color-text-muted)' }}
      >
        <path
          d="M8 1a2 2 0 0 0-2 2v4a2 2 0 1 0 4 0V3a2 2 0 0 0-2-2Z"
          fill="currentColor" opacity="0.8"
        />
        <path
          d="M4 6.5a.5.5 0 0 0-1 0v.5A5 5 0 0 0 7.5 12v2.5h-2a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-2V12A5 5 0 0 0 13 7V6.5a.5.5 0 0 0-1 0V7a4 4 0 0 1-8 0v-.5Z"
          fill="currentColor" opacity="0.6"
        />
      </svg>

      {/* Barres de volume */}
      <div className="volume-bar">
        {heights.map((h, i) => (
          <div
            key={i}
            className="volume-bar__segment"
            style={{
              height: `${h}px`,
              opacity: isActive ? (isSilent ? 0.3 : 0.5 + (volume / 255) * 0.5) : 0.15,
              backgroundColor: isSilent && isActive
                ? 'var(--color-warning)'
                : 'var(--color-cyan)',
            }}
          />
        ))}
      </div>

      {/* Label silence */}
      {isActive && isSilent && (
        <span
          className="text-xs animate-fade-in"
          style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}
        >
          silence
        </span>
      )}
    </div>
  );
}
