// ==========================================================
// YOU VS YOU — componente visual aislado y reutilizable
// Silueta humana frontal, plana y vectorial, estilo plantilla
// médica/fitness: relleno sólido turquesa, contorno blanco fino,
// sin gradientes, sin brillo, sin textura. + 3 puntos interactivos
// tipo "masa/chicle". Fondo negro plano, sin líneas de fondo.
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

// Silueta humana frontal trazada como UN SOLO contorno continuo
// (cabeza, cuello, hombro, brazo, mano con pulgar y dedos simples,
// torso, cadera, pierna y pie), sin formas superpuestas: así no
// aparecen costuras internas. Sin relleno, solo la línea blanca.
const FIGURE_OUTLINE_PATH =
  "M100,13 C118,13 121,24 121,38 C121,52 113,60 109,60 C116,64 126,68 136,88 " +
  "C152,102 158,118 156,142 C154,135 153,158 152,176 C162,180 169,188 168,200 " +
  "C167,208 162,209 160,205 C160,212 157,220 156,227 C155,231 152,231 151,227 " +
  "C151,233 148,240 147,241 C146,241 144,236 144,231 C144,227 141,221 140,217 " +
  "C139,214 137,210 136,206 C135,202 133,198 134,192 C137,187 138,182 140,177 " +
  "C136,166 131,145 128,128 C125,116 123,105 122,98 C122,100 126,122 129,153 " +
  "C127,166 129,183 130,198 C130,203 129,206 128,208 C132,240 133,270 132,300 " +
  "C131,325 130,347 130,365 C138,372 142,378 138,383 C130,390 112,391 106,383 " +
  "C105,365 104,347 103,325 C102,300 101,270 101,240 C100,225 100,215 100,210 " +
  "C100,215 100,225 99,240 C99,270 98,300 97,325 C96,347 95,365 94,383 " +
  "C88,391 70,390 62,383 C58,378 62,372 70,365 C70,347 69,325 68,300 " +
  "C67,270 68,240 72,208 C71,206 70,203 70,198 C71,183 73,166 71,153 " +
  "C74,122 78,100 78,98 C77,105 75,116 72,128 C69,145 64,166 60,177 " +
  "C62,182 63,187 66,192 C67,198 65,202 64,206 C63,210 61,214 60,217 " +
  "C59,221 56,227 56,231 C56,236 54,241 53,241 C52,240 49,233 49,227 " +
  "C48,231 45,231 44,227 C43,220 40,212 40,205 C38,209 33,208 32,200 " +
  "C31,188 38,180 48,176 C47,158 46,135 44,142 C42,118 48,102 64,88 " +
  "C74,68 84,64 91,60 C87,60 79,52 79,38 C79,24 82,13 100,13 Z";

function figureSvgMarkup() {
  return `
    <svg class="yvy2-figure" viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet">
      <path d="${FIGURE_OUTLINE_PATH}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
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
