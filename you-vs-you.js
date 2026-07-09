// ==========================================================
// YOU VS YOU — componente visual aislado y reutilizable
// Masa orgánica animada (canvas 2D) + silueta humana (SVG) +
// 3 puntos interactivos (mente / corazón / cuerpo).
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
  mind:  { x: 0.5,  y: 0.10 },
  heart: { x: 0.5,  y: 0.30 },
  body:  { x: 0.755, y: 0.345 }
};
// Ancla de cada zona dentro del lienzo de la masa (coordenadas normalizadas
// respecto al centro del blob), usada para intensificar el glow rojo local.
const ZONE_GLOW_ANCHOR = {
  mind:  { dx: 0,     dy: -0.95 },
  heart: { dx: 0,     dy: 0 },
  body:  { dx: 0.85,  dy: 0.15 }
};

function buildHandPath(cx, cy, mirror) {
  const fingerAngles = [-24, -8, 8, 24];
  const thumbAngle = mirror ? 52 : -52;
  let out = `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="12"/>`;
  fingerAngles.forEach((a) => {
    out += `<rect x="${cx - 2.3}" y="${cy - 25}" width="4.6" height="21" rx="2.3" transform="rotate(${a} ${cx} ${cy})"/>`;
  });
  out += `<rect x="${cx - 3}" y="${cy - 15}" width="6" height="14" rx="3" transform="rotate(${thumbAngle} ${cx} ${cy})"/>`;
  return out;
}

function buildFootPath(cx, cy) {
  let out = `<ellipse cx="${cx}" cy="${cy}" rx="19" ry="10"/>`;
  [-13, -6.5, 0, 6.5, 13].forEach((dx, i) => {
    const r = i === 2 ? 3.4 : 2.8;
    out += `<circle cx="${cx + dx}" cy="${cy - 8.5}" r="${r}"/>`;
  });
  return out;
}

// Silueta humana frontal — misma proporción/pose que la referencia,
// pero en blanco/gris semitransparente con contorno fino luminoso
// (el color y el fondo originales de la referencia no se usan).
function figureSvgMarkup() {
  return `
    <svg class="yvy2-figure" viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="yvy2BodyGrad" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
          <stop offset="100%" stop-color="rgba(210,225,255,0.10)"/>
        </linearGradient>
      </defs>
      <g fill="url(#yvy2BodyGrad)" stroke="#eaf3ff" stroke-width="1.1" stroke-opacity="0.75" stroke-linejoin="round">
        <ellipse cx="100" cy="46" rx="27" ry="30"/>
        <rect x="88" y="70" width="24" height="22" rx="10"/>
        <path d="M62 100 C62 87 79 80 100 80 C121 80 138 87 138 100 L131 208 C129 220 116 226 100 226 C84 226 71 220 69 208 Z"/>
        <path d="M64 98 C42 108 30 136 32 170 C33 190 36 204 41 213 C46 221 57 218 57 206 L53 168 C52 149 57 128 69 113 Z"/>
        <path d="M136 98 C158 108 170 136 168 170 C167 190 164 204 159 213 C154 221 143 218 143 206 L147 168 C148 149 143 128 131 113 Z"/>
        ${buildHandPath(40, 212, false)}
        ${buildHandPath(160, 212, true)}
        <path d="M70 208 C68 258 64 318 60 366 C59 380 63 392 75 392 C85 392 89 382 89 369 C91 318 93 258 93 210 Z"/>
        <path d="M130 208 C132 258 136 318 140 366 C141 380 137 392 125 392 C115 392 111 382 111 369 C109 318 107 258 107 210 Z"/>
        ${buildFootPath(74, 394)}
        ${buildFootPath(126, 394)}
      </g>
    </svg>`;
}

/**
 * Dibuja la masa orgánica de fondo en un <canvas> 2D.
 * Blob deformado con capas de armónicos senoidales (sin dependencias
 * externas de tipo Perlin/simplex), bandas concéntricas tipo topográfico,
 * glow rojo por zona y partículas digitales.
 */
class OrganicMass {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0;
    this.h = 0;
    this.t = 0;
    this.pointer = { x: 0, y: 0, active: false };
    this.pointerVelocity = 0;
    this._lastPointer = { x: 0, y: 0 };
    this.zoneIntensity = { mind: 0, heart: 0, body: 0 };
    this.zoneTarget = { mind: 0, heart: 0, body: 0 };
    this.particles = this._makeParticles(46);
  }

  _makeParticles(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0.35 + Math.random() * 0.75,
        speed: 0.06 + Math.random() * 0.12,
        size: 0.6 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        drift: 0.15 + Math.random() * 0.35
      });
    }
    return arr;
  }

  resize(width, height) {
    this.w = width;
    this.h = height;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setPointer(x, y, active) {
    this._lastPointer.x = this.pointer.x;
    this._lastPointer.y = this.pointer.y;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = active;
    const dx = this.pointer.x - this._lastPointer.x;
    const dy = this.pointer.y - this._lastPointer.y;
    this.pointerVelocity = Math.min(1, Math.hypot(dx, dy) * 0.08);
  }

  setZoneHover(zone, hovered) {
    this.zoneTarget[zone] = hovered ? 1 : this._activeZone === zone ? 0.7 : 0;
  }

  setActiveZone(zone) {
    this._activeZone = zone;
    ZONES.forEach((z) => {
      this.zoneTarget[z] = z === zone ? 0.7 : 0;
    });
  }

  _blobRadius(angle, layer) {
    const t = this.t;
    const base = 1;
    const n =
      Math.sin(angle * 3 + t * 0.55 + layer * 1.7) * 0.09 +
      Math.sin(angle * 5 - t * 0.35 + layer * 0.9) * 0.05 +
      Math.sin(angle * 7 + t * 0.8 + layer * 2.3) * 0.035;
    return base + n;
  }

  draw() {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    this.t += 0.012;

    // Lerp suave de intensidades de zona
    ZONES.forEach((z) => {
      this.zoneIntensity[z] += (this.zoneTarget[z] - this.zoneIntensity[z]) * 0.08;
    });

    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.42;
    const baseR = Math.min(w, h) * 0.4;

    // Ligero desplazamiento del centro según el puntero (parallax sutil)
    const px = this.pointer.active ? (this.pointer.x - cx) * 0.04 : 0;
    const py = this.pointer.active ? (this.pointer.y - cy) * 0.04 : 0;
    const bcx = cx + px;
    const bcy = cy + py;
    const extraAmp = 1 + this.pointerVelocity * 0.6;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // --- Glow rojo ambiental + por zona ---
    const glowSpots = [
      { x: bcx, y: bcy, r: baseR * 1.05, a: 0.10 }
    ];
    ZONES.forEach((z) => {
      const anchor = ZONE_GLOW_ANCHOR[z];
      const intensity = this.zoneIntensity[z];
      glowSpots.push({
        x: bcx + anchor.dx * baseR,
        y: bcy + anchor.dy * baseR,
        r: baseR * (0.55 + intensity * 0.35),
        a: 0.06 + intensity * 0.34
      });
    });
    glowSpots.forEach((spot) => {
      const g = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, Math.max(spot.r, 1));
      g.addColorStop(0, `rgba(255,70,60,${spot.a})`);
      g.addColorStop(1, "rgba(255,70,60,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    // Halo blanco suave siguiendo el cursor
    if (this.pointer.active) {
      const g = ctx.createRadialGradient(
        this.pointer.x, this.pointer.y, 0,
        this.pointer.x, this.pointer.y, baseR * 0.5
      );
      g.addColorStop(0, "rgba(255,255,255,0.07)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();

    // --- Bandas concéntricas orgánicas (tipo topográfico) ---
    const layers = [
      { scale: 1.0, alpha: 0.5, layer: 0 },
      { scale: 0.82, alpha: 0.38, layer: 1 },
      { scale: 0.64, alpha: 0.3, layer: 2 },
      { scale: 0.46, alpha: 0.22, layer: 3 },
      { scale: 0.28, alpha: 0.16, layer: 4 }
    ];
    const steps = 96;

    layers.forEach(({ scale, alpha, layer }) => {
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const rNoise = this._blobRadius(angle, layer) * extraAmp;
        const r = baseR * scale * rNoise;
        const x = bcx + Math.cos(angle) * r;
        const y = bcy + Math.sin(angle) * r * 1.12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(225,230,240,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // --- Partículas digitales rojas ---
    ctx.save();
    this.particles.forEach((p) => {
      p.angle += p.speed * 0.01;
      const wob = Math.sin(this.t * p.drift + p.phase) * 0.08;
      const r = baseR * (p.radius + wob);
      const x = bcx + Math.cos(p.angle) * r;
      const y = bcy + Math.sin(p.angle) * r * 1.12;
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.t * 1.6 + p.phase * 3));
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,90,80,${0.5 * twinkle})`;
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
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
    <canvas class="yvy2-canvas"></canvas>
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

  const canvas = container.querySelector(".yvy2-canvas");
  const mass = new OrganicMass(canvas);
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
    mass.setActiveZone(zone);
    if (!silent && typeof onSelect === "function") onSelect(zone);
  }
  if (initialActive) {
    mass.setActiveZone(initialActive);
    applyActiveClass();
  }

  hotspots.forEach((btn) => {
    const zone = btn.dataset.zone;
    btn.addEventListener("mouseenter", () => mass.setZoneHover(zone, true));
    btn.addEventListener("mouseleave", () => mass.setZoneHover(zone, false));
    btn.addEventListener("focus", () => mass.setZoneHover(zone, true));
    btn.addEventListener("blur", () => mass.setZoneHover(zone, false));
    btn.addEventListener("click", () => setActive(zone));
  });

  function handlePointerMove(e) {
    const rect = container.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    mass.setPointer(point.clientX - rect.left, point.clientY - rect.top, true);
  }
  function handlePointerLeave() {
    mass.pointer.active = false;
  }
  container.addEventListener("mousemove", handlePointerMove);
  container.addEventListener("mouseleave", handlePointerLeave);
  container.addEventListener("touchmove", handlePointerMove, { passive: true });
  container.addEventListener("touchend", handlePointerLeave);

  let rafId = null;
  function loop() {
    mass.draw();
    rafId = requestAnimationFrame(loop);
  }

  let resizeObserver = null;
  function handleResize() {
    const rect = container.getBoundingClientRect();
    mass.resize(rect.width, rect.height);
  }
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  } else {
    window.addEventListener("resize", handleResize);
  }
  handleResize();
  loop();

  return {
    setActive,
    destroy() {
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handlePointerMove);
      container.removeEventListener("mouseleave", handlePointerLeave);
      container.removeEventListener("touchmove", handlePointerMove);
      container.removeEventListener("touchend", handlePointerLeave);
      container.innerHTML = "";
      container.classList.remove("yvy2-wrap");
    }
  };
}
