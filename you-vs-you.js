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

// Silueta humana trazada directamente desde la imagen real subida
// por el usuario (contorno extraído por visión artificial a partir
// del PNG/JPG original, no dibujado a mano). Un solo contorno
// continuo, sin relleno, solo la línea blanca.
const FIGURE_OUTLINE_PATH =
  "M95.64,6.22 L90.09,7.83 L85.19,11.06 L81.47,15.8 L79.37,22.11 L79.26,27.82 " +
  "L80.39,32.07 L79.05,31.53 L78.02,32.4 L77.64,34.01 L77.81,38.05 L80.93,43.49 " +
  "L83.79,43.92 L84.43,47.91 L86.21,50.87 L86.75,60.14 L68.81,70.05 L61.16,72.15 " +
  "L55.99,75.33 L52.65,78.29 L50.44,81.2 L46.45,89.66 L44.89,97.31 L45.59,108.57 " +
  "L42.52,119.18 L40.69,127.53 L39.72,135.72 L40.15,144.33 L37.57,152.31 L36.27,159.9 " +
  "L33.69,195.67 L32.66,198.2 L26.79,205.85 L24.05,216.73 L20.92,222.55 L21.68,223.57 " +
  "L24.58,223.63 L28.79,220.13 L27.28,235.21 L27.28,238.01 L27.82,238.6 L28.95,238.07 " +
  "L30.62,235.43 L33.8,223.47 L33.8,239.74 L35.3,240.17 L36.22,239.09 L38.64,226.32 " +
  "L39.24,238.28 L40.26,238.87 L41.28,238.17 L42.15,233.27 L43.49,236.4 L45.11,236.4 " +
  "L45.27,224.22 L46.08,219.27 L46.62,208.98 L46.35,203.05 L45.38,197.93 L48.82,188.34 " +
  "L55.77,165.45 L57.07,157.86 L57.39,145.2 L61.05,136.85 L63.69,128.23 L65.09,131.41 " +
  "L66.87,147.67 L67.3,165.07 L68.06,169.98 L66.28,178.49 L66.71,185.6 L61.11,215.33 " +
  "L59.38,231.6 L59.65,249.92 L62.08,268.02 L62.4,275.45 L61.27,284.61 L61.11,293.5 " +
  "L58.63,303.08 L57.39,318.01 L57.23,334.38 L58.58,370.31 L57.17,376.56 L53.94,382.7 " +
  "L48.88,389.76 L40.53,399.94 L35.57,404.09 L34.33,406.24 L34.17,408.99 L36.0,410.93 " +
  "L37.73,411.14 L39.4,412.22 L41.39,411.63 L44.03,413.46 L46.99,413.14 L51.79,409.69 " +
  "L55.07,408.72 L58.14,406.67 L64.88,398.05 L72.47,392.51 L75.54,388.41 L76.03,386.1 " +
  "L74.52,378.55 L75.17,377.32 L75.27,375.65 L74.3,370.74 L75.27,358.84 L78.61,340.95 " +
  "L80.5,335.19 L84.05,327.54 L85.56,320.59 L85.46,310.14 L83.73,296.84 L85.56,293.07 " +
  "L86.59,288.97 L87.66,275.72 L91.33,267.8 L94.34,259.29 L101.29,230.36 L108.13,257.51 " +
  "L111.04,265.7 L115.68,275.67 L116.91,288.76 L117.99,293.12 L119.88,297.11 L119.93,301.25 " +
  "L118.8,310.79 L119.07,321.35 L120.52,327.59 L124.29,335.3 L125.86,339.61 L128.44,351.46 " +
  "L130.92,368.43 L130.11,375.21 L130.33,377.05 L131.19,378.45 L130.27,385.5 L130.65,388.9 " +
  "L133.13,392.45 L140.83,398.16 L145.79,404.95 L148.16,407.32 L150.58,408.77 L153.98,409.85 " +
  "L158.23,413.3 L160.82,413.95 L162.43,413.41 L164.43,411.58 L166.2,412.17 L167.98,411.14 " +
  "L169.76,410.93 L171.43,409.26 L171.59,408.29 L171.16,407.48 L171.38,406.24 L170.46,404.52 " +
  "L165.23,399.99 L149.77,378.99 L148.37,376.24 L147.03,371.12 L147.3,337.88 L146.7,315.31 " +
  "L145.79,305.4 L142.39,292.47 L142.23,284.12 L140.94,273.62 L141.32,264.46 L143.26,248.03 " +
  "L143.09,231.06 L140.46,211.24 L134.75,184.36 L135.07,178.0 L133.24,169.17 L133.78,165.24 " +
  "L133.67,152.25 L135.28,131.24 L136.63,128.44 L138.95,136.36 L142.66,144.77 L142.88,156.89 " +
  "L144.06,164.32 L150.26,185.11 L154.68,197.56 L153.6,202.73 L153.33,207.85 L153.92,218.94 " +
  "L154.73,222.77 L154.84,235.7 L156.35,235.86 L157.75,232.84 L158.72,237.58 L159.52,238.23 " +
  "L160.71,237.63 L161.14,235.32 L161.3,225.68 L163.73,238.5 L164.75,239.52 L166.2,239.04 " +
  "L166.1,222.82 L169.44,234.94 L171.65,238.01 L172.18,237.96 L172.72,236.56 L171.21,219.32 " +
  "L173.75,222.07 L175.47,222.98 L178.16,222.98 L179.03,221.85 L175.85,215.87 L173.1,205.21 " +
  "L166.37,195.72 L163.56,158.23 L162.27,151.12 L159.85,143.85 L160.22,134.64 L159.09,125.91 " +
  "L154.46,108.24 L155.11,96.71 L154.51,92.35 L153.11,87.77 L148.59,79.21 L145.95,76.35 " +
  "L143.04,74.09 L138.46,71.5 L129.41,68.97 L112.23,60.3 L112.28,52.22 L112.61,49.9 " +
  "L113.9,47.21 L114.38,43.92 L115.89,43.87 L116.75,43.33 L119.23,39.45 L119.82,37.51 " +
  "L119.61,32.61 L118.53,31.53 L117.24,31.96 L118.15,25.07 L117.35,18.71 L114.54,13.33 " +
  "L111.96,10.58 L109.43,8.75 L103.07,6.38 Z";

function figureSvgMarkup() {
  return `
    <svg class="yvy2-figure" viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet">
      <path d="${FIGURE_OUTLINE_PATH}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
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
