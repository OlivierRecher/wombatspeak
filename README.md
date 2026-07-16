# 🐻 WombatSpeak

**Le Monkeytype de la voix** — Entraîne ta diction vocale comme un pro.

Application web open-source et **100% gratuite** (0€ d'hébergement, tout s'exécute côté client).

---

## 🎯 Concept

WombatSpeak est un outil d'entraînement vocal qui fonctionne comme [Monkeytype](https://monkeytype.com) mais pour la **voix**. Un texte s'affiche à l'écran, tu le lis à haute voix, et l'application évalue ta diction en temps réel.

### Fonctionnalités

- 🎤 **Reconnaissance vocale** via la Web Speech API (native au navigateur)
- 📊 **Analyse audio en temps réel** (volume, détection des silences) via la Web Audio API
- 🔤 **Comparaison intelligente** avec algorithme de Levenshtein pour tolérer les variations
- 🌍 **Bilingue FR/EN** avec architecture prête pour plus de langues
- 📈 **Métriques** : Vitesse (WPM) et Précision (%)
- 🎨 **Design dark minimaliste** inspiré de Monkeytype avec accent Cyan
- 🐻 **Mascotte cyberpunk** animée

---

## 🚀 Lancer en local

### Prérequis

- [Node.js](https://nodejs.org/) (v18+)
- Un navigateur supportant la Web Speech API (Chrome, Edge recommandés)
- Un microphone

### Installation

```bash
# Clone le repo
git clone <url-du-repo>
cd wombatspeak

# Installe les dépendances
npm install

# Lance le serveur de développement
npm run dev
```

L'application sera disponible sur **http://localhost:5173**

### Build de production

```bash
npm run build
npm run preview
```

---

## 🏗️ Architecture

```
wombatspeak/
├── index.html              # Point d'entrée HTML
├── vite.config.js          # Configuration Vite + React + Tailwind
├── src/
│   ├── main.jsx            # Point d'entrée React
│   ├── App.jsx             # Composant principal (orchestrateur)
│   ├── index.css           # Design system (Tailwind v4 + custom)
│   ├── components/
│   │   ├── Header.jsx      # En-tête avec logo, langue, difficulté
│   │   ├── TextDisplay.jsx # Affichage du texte avec surlignage
│   │   ├── VolumeIndicator.jsx # Indicateur de volume micro
│   │   ├── WombatMascot.jsx    # Mascotte SVG cyberpunk
│   │   └── Results.jsx    # Écran de résultats (WPM, précision)
│   ├── hooks/
│   │   ├── useSpeechRecognition.js  # Hook Web Speech API
│   │   └── useAudioAnalyzer.js      # Hook Web Audio API
│   ├── utils/
│   │   ├── levenshtein.js      # Distance de Levenshtein + similarité
│   │   └── textComparison.js   # Logique de comparaison mot par mot
│   └── texts/
│       ├── fr.json         # Textes d'entraînement en français
│       └── en.json         # Textes d'entraînement en anglais
└── package.json
```

### Stack technique

| Technologie | Usage |
|---|---|
| **React 19** | UI composants |
| **Vite 8** | Build tool |
| **Tailwind CSS v4** | Styling (via @tailwindcss/vite) |
| **Web Speech API** | Reconnaissance vocale |
| **Web Audio API** | Analyse audio temps réel |

---

## 🔧 Ajouter une langue

1. Créer un fichier `src/texts/<code>.json` en suivant le format existant
2. Ajouter la langue dans le composant `Header.jsx` (select)
3. Ajouter l'import dans `App.jsx`

Format du fichier JSON :

```json
{
  "language": "Nom de la langue",
  "code": "xx-XX",
  "texts": [
    {
      "id": 1,
      "title": "Titre du texte",
      "difficulty": "easy|medium|hard",
      "words": "les mots du texte séparés par des espaces"
    }
  ]
}
```

---

## 📋 Roadmap

- [ ] Intégration Whisper Web (Transformers.js) pour une reconnaissance vocale offline
- [ ] Historique des scores (localStorage)
- [ ] Mode entraînement personnalisé (texte libre)
- [ ] Plus de langues (ES, DE, IT, PT...)
- [ ] Mode challenge / chrono
- [ ] PWA (installable)

---

## 📄 Licence

Open Source — MIT License
