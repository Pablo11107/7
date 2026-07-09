// ==========================================================
// YOU VS YOU — componente visual aislado y reutilizable
// Silueta humana limpia (SVG, proporciones adultas) + 3 puntos
// interactivos tipo "masa" (estriada, acento rojo). Sin canvas,
// sin líneas de fondo: fondo negro plano.
//
// Uso:
//   import { mountYouVsYou } from "./you-vs-you.js";
//   const instance = mountYouVsYou(containerEl, {
//     onSelect: (zone) => { ... } // zone: "mind" | "heart" | "body"
//   });
//   instance.setActive("heart");
//   instance.destroy();
//
// No depende de ningún otro módulo ni estilo de la página que lo monta
// (salvo you-vs-you.css). No modifica nada fuera del contenedor recibido.
// ==========================================================

const ZONES = ["mind", "heart", "body"];
const ZONE_LABELS = { mind: "Mente", heart: "Corazón", body: "Cuerpo" };
// Posición relativa (0..1) de cada punto sobre el contenedor.
const ZONE_POSITIONS = {
  mind:  { x: 0.5,   y: 0.095 },
  heart: { x: 0.5,   y: 0.315 },
  body:  { x: 0.745, y: 0.355 }
};

function handMarkup(mirror) {
  const flip = mirror ? "scale(-1,1)" : "";
  return `
    <g transform="${flip}">
      <path d="M-9 -6 C-9 6 -8 16 -7 26 C-7 29 -3 29 -3 26 C-4 16 -4 6 -4 -4 Z"/>
      <path d="M-2 -7 C-2 5 -1 15 0 26 C0 29 4 29 4 26 C3 15 3 5 2 -6 Z"/>
      <path d="M5 -6 C5 5 6 15 6 25 C6 28 10 28 10 25 C9 15 9 5 9 -5 Z"/>
      <path d="M-13 4 C-16 12 -17 20 -15 28 C-14 31 -10 30 -11 27 C-12 20 -11 13 -9 6 Z" transform="rotate(-18 -13 4)"/>
    </g>`;
}

function footMarkup(mirror) {
  const flip = mirror ? "scale(-1,1)" : "";
  return `
    <g transform="${flip}">
      <ellipse cx="0" cy="0" rx="16" ry="8"/>
      <ellipse cx="-11" cy="-6" rx="2.6" ry="3.2"/>
      <ellipse cx="-5" cy="-8" rx="2.8" ry="3.4"/>
      <ellipse cx="1" cy="-8.5" rx="3" ry="3.6"/>
      <ellipse cx="7" cy="-8" rx="2.7" ry="3.3"/>
      <ellipse cx="12" cy="-6" rx="2.4" ry="3"/>
    </g>`;
}

// Silueta humana frontal, proporciones adultas, trazo limpio y
// simétrico (cabeza, cuello, torso, brazos con manos, piernas con
// pies) en blanco/gris translúcido con contorno fino luminoso.
function figureSvgMarkup() {
  return `
    <svg class="yvy2-figure" viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="yvy2BodyGrad" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
          <stop offset="100%" stop-color="rgba(215,222,235,0.09)"/>
        </linearGradient>
      </defs>
      <g fill="url(#yvy2BodyGrad)" stroke="#eef2fa" stroke-width="1" stroke-opacity="0.7" stroke-linejoin="round" stroke-linecap="round">
        <!-- cabeza -->
        <ellipse cx="100" cy="40" rx="22" ry="25"/>
        <!-- cuello -->
        <path d="M91 62 C91 70 92 76 100 76 C108 76 109 70 109 62 Z"/>
        <!-- torso -->
        <path d="M68 90 C68 80 82 74 100 74 C118 74 132 80 132 90
                 C132 90 129 150 128 152 C127 170 126 195 125 206
                 C124 216 113 221 100 221 C87 221 76 216 75 206
                 C74 195 73 170 72 152 C71 150 68 90 68 90 Z"/>
        <!-- brazo izquierdo -->
        <path d="M70 88 C56 93 47 108 46 130 C45 150 47 172 50 195
                 C51 205 52 218 53 228 L61 228 C61 218 60 205 60 195
                 C60 172 61 150 63 132 C64 116 66 100 76 93 Z"/>
        <ellipse cx="57" cy="232" rx="9" ry="11"/>
        <g transform="translate(57,238)">${handMarkup(false)}</g>
        <!-- brazo derecho -->
        <path d="M130 88 C144 93 153 108 154 130 C155 150 153 172 150 195
                 C149 205 148 218 147 228 L139 228 C139 218 140 205 140 195
                 C140 172 139 150 137 132 C136 116 134 100 124 93 Z"/>
        <ellipse cx="143" cy="232" rx="9" ry="11"/>
        <g transform="translate(143,238)">${handMarkup(true)}</g>
        <!-- pierna izquierda -->
        <path d="M78 208 C76 250 74 305 71 350 C70 365 73 378 82 378
                 C89 378 91 368 91 356 C92 315 94 265 95 220 Z"/>
        <!-- pierna derecha -->
        <path d="M122 208 C124 250 126 305 129 350 C130 365 127 378 118 378
                 C111 378 109 368 109 356 C108 315 106 265 105 220 Z"/>
        <!-- pie izquierdo -->
        <g transform="translate(82,382) rotate(-8)">${footMarkup(false)}</g>
        <!-- pie derecho -->
        <g transform="translate(118,382) rotate(8)">${footMarkup(true)}</g>
      </g>
    </svg>`;
}

/**
 * Monta el componente YOU VS YOU dentro de `container`.
 * @param {HTMLElement} container
 * @param {{ onSelect?: (zone: "mind"|"heart"|"body") => void, initialActive?: string }} options
 */
export function mountYouVsYou(container, options = {}) {
  const { onSelect, initialActive = null } = options;

  container.classList.add("yvy2-wrap");
  container.innerHTML = `
    ${figureSvgMarkup()}
    ${ZONES.map(
      (z) => `
      <button type="button" class="yvy2-hotspot" data-zone="${z}" aria-label="${ZONE_LABELS[z]}"
        style="left:${ZONE_POSITIONS[z].x * 100}%; top:${ZONE_POSITIONS[z].y * 100}%;">
        <span class="yvy2-hotspot-dot"></span>
        <span class="yvy2-tooltip">${ZONE_LABELS[z]}</span>
      </button>`
    ).join("")}
  `;

  const hotspots = Array.from(container.querySelectorAll(".yvy2-hotspot"));

  let activeZone = initialActive;
  function applyActiveClass() {
    hotspots.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.zone === activeZone);
    });
  }
  function setActive(zone, { silent = false } = {}) {
    activeZone = zone;
    applyActiveClass();
    if (!silent && typeof onSelect === "function") onSelect(zone);
  }
  if (initialActive) applyActiveClass();

  hotspots.forEach((btn) => {
    const zone = btn.dataset.zone;
    btn.addEventListener("click", () => setActive(zone));
  });

  return {
    setActive,
    destroy() {
      container.innerHTML = "";
      container.classList.remove("yvy2-wrap");
    }
  };
}
