import React from 'react';

/**
 * Mascotte WombatSpeak — Wombat cyberpunk dessiné en contours cyan
 * avec des ondes sonores qui sortent du museau.
 * @param {Object} props
 * @param {boolean} props.speaking - Si le wombat est en mode "écoute active"
 * @param {string} props.className - Classes CSS additionnelles
 */
export default function WombatMascot({ speaking = false, className = '' }) {
  return (
    <div className={`mascot-glow ${className}`} style={{ display: 'inline-block' }}>
      <svg
        width="120"
        height="100"
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="WombatSpeak mascot"
      >
        {/* Corps trappu du wombat */}
        <ellipse
          cx="50" cy="62" rx="32" ry="24"
          stroke="#00d8ff" strokeWidth="2" fill="none"
          opacity="0.8"
        />

        {/* Tête */}
        <circle
          cx="72" cy="40" r="18"
          stroke="#00d8ff" strokeWidth="2" fill="none"
        />

        {/* Oreilles arrondies */}
        <ellipse cx="62" cy="24" rx="5" ry="8" stroke="#00d8ff" strokeWidth="1.5" fill="none" />
        <ellipse cx="82" cy="24" rx="5" ry="8" stroke="#00d8ff" strokeWidth="1.5" fill="none" />

        {/* Yeux */}
        <circle cx="66" cy="38" r="2.5" fill="#00d8ff" opacity="0.9" />
        <circle cx="78" cy="38" r="2.5" fill="#00d8ff" opacity="0.9" />

        {/* Museau / nez */}
        <ellipse cx="80" cy="46" rx="6" ry="4" stroke="#00d8ff" strokeWidth="1.5" fill="none" />
        <circle cx="80" cy="45" r="1.5" fill="#00d8ff" opacity="0.7" />

        {/* Pattes courtes */}
        <line x1="30" y1="82" x2="30" y2="94" stroke="#00d8ff" strokeWidth="2" strokeLinecap="round" />
        <line x1="45" y1="84" x2="45" y2="94" stroke="#00d8ff" strokeWidth="2" strokeLinecap="round" />
        <line x1="55" y1="84" x2="55" y2="94" stroke="#00d8ff" strokeWidth="2" strokeLinecap="round" />
        <line x1="70" y1="82" x2="70" y2="94" stroke="#00d8ff" strokeWidth="2" strokeLinecap="round" />

        {/* Ondes sonores du museau */}
        <g opacity={speaking ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }}>
          <path
            d="M92 42 C96 38, 96 50, 92 46"
            stroke="#00d8ff" strokeWidth="1.5" fill="none"
            opacity="0.6"
          >
            {speaking && (
              <animate
                attributeName="opacity"
                values="0.2;0.8;0.2"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </path>
          <path
            d="M98 38 C104 32, 104 54, 98 48"
            stroke="#00d8ff" strokeWidth="1.2" fill="none"
            opacity="0.4"
          >
            {speaking && (
              <animate
                attributeName="opacity"
                values="0.1;0.6;0.1"
                dur="1.3s"
                repeatCount="indefinite"
              />
            )}
          </path>
          <path
            d="M104 34 C112 26, 112 58, 104 50"
            stroke="#00d8ff" strokeWidth="1" fill="none"
            opacity="0.25"
          >
            {speaking && (
              <animate
                attributeName="opacity"
                values="0.05;0.4;0.05"
                dur="1.6s"
                repeatCount="indefinite"
              />
            )}
          </path>
        </g>

        {/* Effet de glow ambiant */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
