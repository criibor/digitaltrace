const fs = require('fs');
const path = require('path');

const inhalte = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'inhalte.json'), 'utf-8'));

const head = (item) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${item.titel} — Digital Trace</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="../css/style.css">
</head>
<body>

<button id="theme-toggle" class="theme-toggle" aria-label="Dark/Light Mode umschalten">◐</button>
<a href="../index.html" class="home-button">Home</a>
`;


const footer = `
<footer class="site-footer">© XY</footer>
`;

// --- Moodboard-Template (Processes, Future Exhibition) ---
const moodboardTemplate = (item) => `${head(item)}
<header class="detail-header">
  <h1>${item.titel}</h1>
  <button id="view-toggle" class="view-toggle">Moodboard / Grid</button>
</header>

<button id="info-toggle" class="info-toggle" aria-label="Info anzeigen">i</button>
<aside id="info-panel" class="info-panel">
  <h2>${item.titel}</h2>
  <p>${item.text}</p>
</aside>

<main id="gallery" class="gallery" data-item-id="${item.id}"></main>
${footer}
<script>
  window.__ITEM_DATA__ = ${JSON.stringify(item)};
</script>
<script src="../js/canvas-gallery.js"></script>
</body>
</html>
`;

// --- Listen-Template (Glossary) ---
const listeTemplate = (item) => `${head(item)}
<header class="detail-header">
  <h1>${item.titel}</h1>
</header>

<main class="static-page glossary-page">
  <p class="glossary-intro">${item.text}</p>
  <dl class="glossary-list">
    ${item.eintraege
      .map(
        (e) => `
    <div class="glossary-entry">
      <dt>${e.titel}</dt>
      <dd>${e.text}</dd>
    </div>`
      )
      .join('')}
  </dl>
</main>
${footer}
<script src="../js/theme.js"></script>
</body>
</html>
`;

// --- Text-Template (Concept) ---
const textTemplate = (item) => `${head(item)}
<header class="detail-header">
  <h1>${item.titel}</h1>
</header>

<main class="static-page">
  <p>${item.text}</p>
</main>
${footer}
<script src="../js/theme.js"></script>
</body>
</html>
`;

// --- Video-Template (Final Piece) ---
const videoTemplate = (item) => `${head(item)}
<header class="detail-header">
  <h1>${item.titel}</h1>
</header>

<main class="video-page">
  ${
    item.embedUrl
      ? `<div class="video-frame-wrapper">
    <iframe
      src="${item.embedUrl}"
      class="video-embed"
      frameborder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>`
      : `<video class="video-embed" src="../${item.video}" controls playsinline></video>`
  }
  <p class="video-caption">${item.text}</p>
</main>
${footer}
<script src="../js/theme.js"></script>
</body>
</html>
`;

function renderTemplate(item) {
  if (item.typ === 'liste') return listeTemplate(item);
  if (item.typ === 'text') return textTemplate(item);
  if (item.typ === 'video') return videoTemplate(item);
  return moodboardTemplate(item);
}

const pagesDir = path.join(__dirname, 'pages');
if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir);

inhalte.forEach((item) => {
  const outPath = path.join(pagesDir, `${item.id}.html`);
  fs.writeFileSync(outPath, renderTemplate(item), 'utf-8');
  console.log(`Erstellt: pages/${item.id}.html (${item.typ || 'moodboard'})`);
});

console.log(`\nFertig. ${inhalte.length} Seiten generiert.`);
