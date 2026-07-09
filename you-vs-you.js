// ==========================================================
// YOU VS YOU — componente visual aislado y reutilizable
// Silueta humana con curvas anatómicas reales (torso, brazos y
// piernas ahusados con Bézier, no cápsulas rectas ni formas de
// juguete) + 3 puntos interactivos tipo "masa/chicle". Sin
// canvas, sin líneas de fondo: fondo negro plano.
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
  mind:  { x: 0.5,   y: 0.09 },
  heart: { x: 0.5,   y: 0.30 },
  body:  { x: 0.775, y: 0.335 }
};

// Silueta humana frontal con proporciones y curvas anatómicas
// (hombros, cintura, cadera, brazos y piernas ahusados) en blanco/
// gris translúcido con contorno fino luminoso.
function figureSvgMarkup() {
  return `
    <svg class="yvy2-figure" viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="yvy2BodyGrad" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.95)"/>
          <stop offset="100%" stop-color="rgba(210,216,230,0.82)"/>
        </linearGradient>
      </defs>
      <g fill="url(#yvy2BodyGrad)" stroke="#eef2fa" stroke-opacity="0.55" stroke-width="1" stroke-linejoin="round">
        <!-- cabeza -->
        <ellipse cx="100" cy="38" rx="21" ry="25"/>
        <!-- cuello -->
        <path d="M91 58 C91 66 92 72 100 72 C108 72 109 66 109 58 Z"/>
        <!-- torso: hombros -> cintura -> cadera -->
        <path d="M64 90 C64 80 78 74 100 74 C122 74 136 80 136 90
                 C137 115 133 140 129 152 C126 162 128 180 130 198
                 C131 213 118 222 100 222 C82 222 69 213 70 198
                 C72 180 74 162 71 152 C67 140 63 115 64 90 Z"/>
        <!-- brazo izquierdo -->
        <path d="M70 88 C56 94 45 110 44 135 C43 158 45 180 49 200
                 C50 208 51 215 52 222 L60 222 C59 215 58 208 58 200
                 C57 180 58 158 61 137 C63 116 66 100 76 92 Z"/>
        <!-- brazo derecho -->
        <path d="M130 88 C144 94 155 110 156 135 C157 158 155 180 151 200
                 C150 208 149 215 148 222 L140 222 C141 215 142 208 142 200
                 C143 180 142 158 139 137 C137 116 134 100 124 92 Z"/>
        <!-- pierna izquierda -->
        <path d="M78 206 C76 240 73 290 70 335 C69 352 70 368 74 376
                 C77 382 85 382 88 376 C90 368 90 352 91 335 C92 290 93 240 95 208 Z"/>
        <!-- pierna derecha -->
        <path d="M122 206 C124 240 127 290 130 335 C131 352 130 368 126 376
                 C123 382 115 382 112 376 C110 368 110 352 109 335 C108 290 107 240 105 208 Z"/>
        <!-- manos -->
        <ellipse cx="46" cy="226" rx="10" ry="13"/>
        <ellipse cx="154" cy="226" rx="10" ry="13"/>
        <g stroke="#eef2fa" stroke-width="5" stroke-linecap="round" fill="none" stroke-opacity="0.9">
          <line x1="38" y1="234" x2="35" y2="256"/>
          <line x1="43" y1="237" x2="41" y2="260"/>
          <line x1="49" y1="237" x2="49" y2="260"/>
          <line x1="55" y1="234" x2="56" y2="256"/>
          <line x1="34" y1="228" x2="24" y2="240"/>
          <line x1="162" y1="234" x2="165" y2="256"/>
          <line x1="157" y1="237" x2="159" y2="260"/>
          <line x1="151" y1="237" x2="151" y2="260"/>
          <line x1="145" y1="234" x2="144" y2="256"/>
          <line x1="166" y1="228" x2="176" y2="240"/>
        </g>
        <!-- pies -->
        <g transform="translate(78,378) rotate(-12)">
          <ellipse cx="0" cy="0" rx="17" ry="9"/>
          <circle cx="-12" cy="-6" r="2.6"/><circle cx="-6" cy="-8.5" r="2.9"/><circle cx="0" cy="-9" r="3"/><circle cx="6" cy="-8.5" r="2.8"/><circle cx="12" cy="-6" r="2.5"/>
        </g>
        <g transform="translate(122,378) rotate(12)">
          <ellipse cx="0" cy="0" rx="17" ry="9"/>
          <circle cx="-12" cy="-6" r="2.5"/><circle cx="-6" cy="-8.5" r="2.8"/><circle cx="0" cy="-9" r="3"/><circle cx="6" cy="-8.5" r="2.9"/><circle cx="12" cy="-6" r="2.6"/>
        </g>
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
