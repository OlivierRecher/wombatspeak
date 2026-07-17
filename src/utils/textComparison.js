import { similarity, MATCH_THRESHOLD } from './levenshtein';

/**
 * Statuts possibles pour chaque mot
 */
export const WordStatus = {
  PENDING: 'pending',   // Pas encore atteint
  ACTIVE: 'active',     // Mot en cours
  CORRECT: 'correct',   // Bien prononcé
  INCORRECT: 'incorrect' // Mal prononcé
};

/**
 * Normalise un mot pour la comparaison (minuscules, suppression ponctuation, accents simplifiés)
 */
export function normalizeWord(word) {
  if (!word || typeof word !== 'string') return '';
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Aligne les mots prononcés avec les mots attendus en utilisant la programmation dynamique.
 * Gère parfaitement les insertions, suppressions (sauts) et substitutions.
 *
 * @param {string[]} expectedWords
 * @param {string[]} spokenWords
 * @returns {Array<{expectedIdx: number, status: string, spoken: string|null}>}
 */
export function alignWords(expectedWords, spokenWords) {
  const n = expectedWords.length;
  const m = spokenWords.length;
  
  if (m === 0) {
    const statuses = expectedWords.map((w, i) => ({ expectedIdx: i, status: WordStatus.PENDING, spoken: null }));
    return { statuses, currentIndex: 0 };
  }

  const MATCH_SCORE = 1.0;
  const SUB_PENALTY = -0.1;
  const INS_PENALTY = -0.2;
  const DEL_PENALTY = -0.2;

  const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

  // Initialisation
  for (let i = 0; i <= n; i++) dp[i][0] = i * DEL_PENALTY;
  for (let j = 0; j <= m; j++) dp[0][j] = j * INS_PENALTY;

  // Remplissage de la matrice des scores
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const expected = normalizeWord(expectedWords[i - 1]);
      const spoken = normalizeWord(spokenWords[j - 1]);
      const score = similarity(expected, spoken);
      
      const matchScore = score >= MATCH_THRESHOLD ? MATCH_SCORE : SUB_PENALTY; 
      
      dp[i][j] = Math.max(
        dp[i - 1][j - 1] + matchScore, // Match / Substitution
        dp[i - 1][j] + DEL_PENALTY,    // Deletion (mot attendu sauté)
        dp[i][j - 1] + INS_PENALTY     // Insertion (mot prononcé en trop)
      );
    }
  }

  // On cherche la fin de l'alignement (free end gap pour expectedWords)
  let maxScore = -Infinity;
  let bestI = 0;
  for (let i = 0; i <= n; i++) {
    if (dp[i][m] >= maxScore) {
      maxScore = dp[i][m];
      bestI = i;
    }
  }

  // Backtracking
  const alignment = [];
  let i = bestI;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const expected = normalizeWord(expectedWords[i - 1]);
      const spoken = normalizeWord(spokenWords[j - 1]);
      const score = similarity(expected, spoken);
      const matchScore = score >= MATCH_THRESHOLD ? MATCH_SCORE : SUB_PENALTY;
      
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + matchScore)) < 0.01) {
        alignment.unshift({
          expectedIdx: i - 1,
          status: matchScore === MATCH_SCORE ? WordStatus.CORRECT : WordStatus.INCORRECT,
          spoken: spokenWords[j - 1]
        });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + DEL_PENALTY)) < 0.01) {
      alignment.unshift({
        expectedIdx: i - 1,
        status: WordStatus.INCORRECT,
        spoken: null
      });
      i--;
      continue;
    }
    if (j > 0 && Math.abs(dp[i][j] - (dp[i][j - 1] + INS_PENALTY)) < 0.01) {
      j--;
      continue;
    }
    break;
  }

  // Construire le tableau final pour chaque mot attendu
  const finalStatuses = expectedWords.map((w, idx) => {
    const aligned = alignment.find(a => a.expectedIdx === idx);
    if (aligned) {
      return { status: aligned.status, spoken: aligned.spoken };
    }
    return { status: WordStatus.PENDING, spoken: null };
  });

  return { statuses: finalStatuses, currentIndex: bestI };
}

/**
 * Calcule les métriques finales (WPM et précision)
 */
export function calculateMetrics(statuses, elapsedTimeMs) {
  const evaluated = statuses.filter(
    (s) => s.status === WordStatus.CORRECT || s.status === WordStatus.INCORRECT
  );
  const correct = evaluated.filter((s) => s.status === WordStatus.CORRECT).length;
  const incorrect = evaluated.filter((s) => s.status === WordStatus.INCORRECT).length;
  const total = evaluated.length;

  const elapsedMinutes = elapsedTimeMs / 60000;
  const wpm = elapsedMinutes > 0 ? Math.round(correct / elapsedMinutes) : 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { wpm, accuracy, correct, incorrect, total };
}
