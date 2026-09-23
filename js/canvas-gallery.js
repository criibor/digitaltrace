// --- Theme handling ---
const themeToggle = document.getElementById('theme-toggle');
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};
const savedTheme = localStorage.getItem('theme')
  || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// --- Info Panel ---
const infoToggle = document.getElementById('info-toggle');
const infoPanel = document.getElementById('info-panel');
infoToggle.addEventListener('click', () => {
  infoPanel.classList.toggle('open');
});

// --- Gallery Setup ---
const kategorie = window.__ITEM_DATA__;
const gallery = document.getElementById('gallery');

const canvas = document.createElement('div');
canvas.className = 'gallery-canvas';
gallery.appendChild(canvas);

const spread = 900;

kategorie.eintraege.forEach((eintrag) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'gallery-item';

  const img = document.createElement('img');
  img.src = '../' + eintrag.bild;
  img.className = 'gallery-image';
  img.draggable = false;

  const label = document.createElement('div');
  label.className = 'gallery-label';
  label.textContent = eintrag.titel;

  const w = 260 + Math.random() * 80;
  const h = 260 + Math.random() * 80;
  const x = Math.random() * spread - spread / 2 + window.innerWidth / 2;
  const y = Math.random() * spread - spread / 2 + window.innerHeight / 2;

  wrapper.style.width = `${w}px`;
  wrapper.style.left = `${x}px`;
  wrapper.style.top = `${y}px`;
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;

  wrapper.appendChild(img);
  wrapper.appendChild(label);
  canvas.appendChild(wrapper);

  // Einzelnes Bild per Drag & Drop frei verschieben (nur im Moodboard-Modus)
  let itemDragging = false;
  let itemMoved = false;
  let itemStartX = 0;
  let itemStartY = 0;
  let wrapperStartLeft = x;
  let wrapperStartTop = y;

  wrapper.addEventListener('mousedown', (e) => {
    if (gallery.classList.contains('grid-mode')) return;
    e.preventDefault();
    e.stopPropagation(); // verhindert, dass die ganze Canvas mitgezogen wird
    itemDragging = true;
    itemMoved = false;
    wrapper.classList.add('item-dragging');
    itemStartX = e.clientX;
    itemStartY = e.clientY;
    wrapperStartLeft = parseFloat(wrapper.style.left);
    wrapperStartTop = parseFloat(wrapper.style.top);
  });

  window.addEventListener('mousemove', (e) => {
    if (!itemDragging) return;
    const dx = (e.clientX - itemStartX) / scale;
    const dy = (e.clientY - itemStartY) / scale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) itemMoved = true;
    wrapper.style.left = `${wrapperStartLeft + dx}px`;
    wrapper.style.top = `${wrapperStartTop + dy}px`;
  });

  window.addEventListener('mouseup', () => {
    if (itemDragging) {
      itemDragging = false;
      wrapper.classList.remove('item-dragging');
    }
  });

  img.addEventListener('click', () => {
    if (!gallery.classList.contains('grid-mode') && !itemMoved) {
      openLightbox('../' + eintrag.bild, eintrag.titel);
    }
  });
});

// --- Drag / Pan ---
let panX = 0;
let panY = 0;
let scale = 1;
let isDragging = false;
let startX = 0;
let startY = 0;

function updateTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

gallery.addEventListener('mousedown', (e) => {
  if (gallery.classList.contains('grid-mode')) return;
  e.preventDefault();
  isDragging = true;
  gallery.classList.add('dragging');
  startX = e.clientX - panX;
  startY = e.clientY - panY;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  gallery.classList.remove('dragging');
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  updateTransform();
});

// --- Zoom (Scroll) ---
gallery.addEventListener(
  'wheel',
  (e) => {
    if (gallery.classList.contains('grid-mode')) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    scale = Math.min(2.5, Math.max(0.4, scale + delta));
    updateTransform();
  },
  { passive: false }
);

// --- Grid / Moodboard Toggle ---
const viewToggle = document.getElementById('view-toggle');
viewToggle.addEventListener('click', () => {
  gallery.classList.toggle('grid-mode');
  if (!gallery.classList.contains('grid-mode')) {
    updateTransform();
  }
});

// --- Lightbox ---
function openLightbox(src, titel) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '200';
  overlay.style.cursor = 'zoom-out';
  overlay.style.gap = '16px';

  const img = document.createElement('img');
  img.src = src;
  img.style.maxWidth = '85vw';
  img.style.maxHeight = '80vh';
  img.style.borderRadius = '4px';
  img.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';

  const caption = document.createElement('div');
  caption.textContent = titel;
  caption.style.color = '#fff';
  caption.style.fontSize = '0.9rem';
  caption.style.letterSpacing = '0.03em';

  overlay.appendChild(img);
  overlay.appendChild(caption);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}