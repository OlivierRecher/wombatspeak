/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * Utilisé pour tolérer les légères variations de transcription vocale.
 * @param {string} a - Première chaîne
 * @param {string} b - Deuxième chaîne
 * @returns {number} La distance d'édition entre les deux chaînes
 */
export function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // suppression
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Compare deux mots et retourne un score de similarité entre 0 et 1.
 * @param {string} expected - Le mot attendu
 * @param {string} spoken - Le mot prononcé/transcrit
 * @returns {number} Score de similarité (1 = identique, 0 = complètement différent)
 */
export function similarity(expected, spoken) {
  const maxLen = Math.max(expected.length, spoken.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(expected, spoken);
  if (maxLen <= 3) {
    return dist === 0 ? 1 : 0; // Exige une prononciation parfaite pour les petits mots
  }
  return 1 - dist / maxLen;
}

/**
 * Seuil de similarité pour considérer un mot comme correct.
 * Un score >= MATCH_THRESHOLD est accepté.
 */
export const MATCH_THRESHOLD = 0.75;
