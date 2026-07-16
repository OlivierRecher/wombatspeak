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

  const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

  // Initialisation
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  // Remplissage de la matrice des coûts
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const expected = normalizeWord(expectedWords[i - 1]);
      const spoken = normalizeWord(spokenWords[j - 1]);
      const score = similarity(expected, spoken);
      
      // On met une pénalité légèrement inférieure à 1.0 (ex: 0.99) pour la substitution.
      // Pourquoi ? Car une insertion coûte 1.0. À la fin du texte, laisser le dernier mot "pending" est gratuit.
      // Si la substitution coûte 1.5, l'algo préfère considérer un dernier mot mal prononcé comme une insertion (+1.0)
      // et laisse le dernier mot attendu en "pending", ce qui empêche le chrono de s'arrêter.
      // Avec 0.99, l'algo préfère substituer (0.99) plutôt qu'insérer (1.0), et le texte se termine !
      const matchCost = score >= MATCH_THRESHOLD ? 0 : 0.99; 
      
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + matchCost, // Match / Substitution
        dp[i - 1][j] + 1,             // Deletion (mot attendu sauté)
        dp[i][j - 1] + 1              // Insertion (mot prononcé en trop)
      );
    }
  }

  // On cherche la fin de l'alignement (free end gap pour expectedWords)
  // L'utilisateur n'a probablement pas encore lu tout le texte
  let minCost = Infinity;
  let bestI = 0;
  for (let i = 0; i <= n; i++) {
    if (dp[i][m] <= minCost) {
      minCost = dp[i][m];
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
      const matchCost = score >= MATCH_THRESHOLD ? 0 : 0.99;
      
      // En JS, on gère les imprécisions des flottants
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + matchCost)) < 0.01) {
        alignment.unshift({
          expectedIdx: i - 1,
          status: matchCost === 0 ? WordStatus.CORRECT : WordStatus.INCORRECT,
          spoken: spokenWords[j - 1]
        });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 0.01) {
      alignment.unshift({
        expectedIdx: i - 1,
        status: WordStatus.INCORRECT,
        spoken: null
      });
      i--;
      continue;
    }
    if (j > 0 && Math.abs(dp[i][j] - (dp[i][j - 1] + 1)) < 0.01) {
      // Le mot prononcé était une insertion (bruit, bégaiement)
      // On l'ignore dans l'affichage principal
      j--;
      continue;
    }
    // Fallback de sécurité (ne devrait jamais arriver)
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
