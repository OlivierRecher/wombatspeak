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
 * @param {string} word
 * @returns {string}
 */
export function normalizeWord(word) {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]/g, '');      // Supprime la ponctuation
}

/**
 * Compare le texte transcrit avec les mots attendus et retourne les résultats.
 * Gère la progression mot par mot.
 * @param {string[]} expectedWords - Liste des mots du texte à lire
 * @param {string[]} spokenWords - Liste des mots transcrits
 * @param {number} currentIndex - Index du mot actuel dans expectedWords
 * @returns {{ results: Array<{word: string, status: string}>, newIndex: number }}
 */
export function compareWords(expectedWords, spokenWords, currentIndex) {
  const results = expectedWords.map((word, i) => {
    if (i < currentIndex) {
      return null; // Déjà traité, ne pas modifier
    }
    if (i > currentIndex + spokenWords.length) {
      return { word, status: WordStatus.PENDING };
    }
    return { word, status: WordStatus.PENDING };
  });

  let newIndex = currentIndex;

  // Compare chaque mot prononcé avec le mot attendu correspondant
  for (let i = 0; i < spokenWords.length && newIndex < expectedWords.length; i++) {
    const expected = normalizeWord(expectedWords[newIndex]);
    const spoken = normalizeWord(spokenWords[i]);

    if (!spoken) continue; // Ignorer les mots vides

    const score = similarity(expected, spoken);

    results[newIndex] = {
      word: expectedWords[newIndex],
      status: score >= MATCH_THRESHOLD ? WordStatus.CORRECT : WordStatus.INCORRECT
    };

    // Vérifier aussi si le mot prononcé correspond au mot suivant (skip detection)
    if (score < MATCH_THRESHOLD && newIndex + 1 < expectedWords.length) {
      const nextExpected = normalizeWord(expectedWords[newIndex + 1]);
      const nextScore = similarity(nextExpected, spoken);
      if (nextScore >= MATCH_THRESHOLD) {
        // L'utilisateur a sauté un mot
        results[newIndex] = {
          word: expectedWords[newIndex],
          status: WordStatus.INCORRECT
        };
        newIndex++;
        results[newIndex] = {
          word: expectedWords[newIndex],
          status: WordStatus.CORRECT
        };
      }
    }

    newIndex++;
  }

  return { results, newIndex };
}

/**
 * Calcule les métriques finales (WPM et précision)
 * @param {Array<{word: string, status: string}>} wordResults - Résultats mot par mot
 * @param {number} elapsedTimeMs - Temps écoulé en millisecondes
 * @returns {{ wpm: number, accuracy: number, correct: number, incorrect: number, total: number }}
 */
export function calculateMetrics(wordResults, elapsedTimeMs) {
  const evaluated = wordResults.filter(
    (w) => w.status === WordStatus.CORRECT || w.status === WordStatus.INCORRECT
  );
  const correct = evaluated.filter((w) => w.status === WordStatus.CORRECT).length;
  const incorrect = evaluated.filter((w) => w.status === WordStatus.INCORRECT).length;
  const total = evaluated.length;

  // WPM = (mots correctement prononcés / temps en minutes)
  const elapsedMinutes = elapsedTimeMs / 60000;
  const wpm = elapsedMinutes > 0 ? Math.round(correct / elapsedMinutes) : 0;

  // Précision = (mots corrects / total évalué) * 100
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { wpm, accuracy, correct, incorrect, total };
}
