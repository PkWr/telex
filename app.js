// Text ASCII prototype. Samples an image to a grid, assigns each cell to a tone band, and sets each band in its own running text.
(function () {
  "use strict";
  const $ = id => document.getElementById(id), W = 1200, H = 800;
  const IMGS = window.IMGS || null, N = IMGS ? IMGS.length : 42;
  const cv = $("cv"), ctx = cv.getContext("2d");
  const FONT = 'italic 400 SIZEpx "IBM Plex Mono", ui-monospace, monospace';
  $("t0").value = "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. ";
  $("t1").value = "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families. ";
  $("t2").value = "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it. ";
  for (let i = 1; i <= N; i++) { const o = document.createElement("option"); o.value = i; o.textContent = "Demo " + i; $("img").appendChild(o); }
  let cols, rows, cw, chh, lum, css, band, rankRow, colStart, cellStart, bodies, dirty = true, lastStep = -1, IM = null;
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function prepText() { bodies = [0, 1, 2].map(i => { const s = Array.from($("t" + i).value.replace(/\s+/g, " ").trim() + " "); return s.length > 1 ? s : [" "]; }); }
  function loadImg() {
    const im = new Image(); im.onload = () => { IM = im; resample(); };
    const n = +$("img").value;
    im.src = IMGS ? IMGS[n - 1] : "demo/demo-" + String(n).padStart(2, "0") + ".jpg";
  }
  function resample() {
    if (!IM) return;
    const cs = +$("cell").value; cw = cs * 0.6; chh = cs;
    cols = Math.floor(W / cw); rows = Math.floor(H / chh);
    const t = document.createElement("canvas"); t.width = cols; t.height = rows;
    const tc = t.getContext("2d"); tc.imageSmoothingEnabled = true;
    const pa = (cols * cw) / (rows * chh); let sw = IM.width, sh = IM.height;
    if (sw / sh > pa) sw = sh * pa; else sh = sw / pa;
    tc.drawImage(IM, (IM.width - sw) / 2, (IM.height - sh) / 2, sw, sh, 0, 0, cols, rows);
    const d = tc.getImageData(0, 0, cols, rows).data, n = cols * rows;
    lum = new Float32Array(n); css = new Array(n); let mn = 1, mx = 0;
    for (let i = 0; i < n; i++) { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; const l = (.299 * r + .587 * g + .114 * b) / 255; lum[i] = l; if (l < mn) mn = l; if (l > mx) mx = l; css[i] = `rgb(${r},${g},${b})`; }
    const span = Math.max(.01, mx - mn); for (let i = 0; i < n; i++) lum[i] = (lum[i] - mn) / span;
    const R = rng(7); colStart = new Int32Array(cols); for (let c = 0; c < cols; c++) colStart[c] = Math.floor(R() * 1e6);
    cellStart = new Int32Array(n); for (let i = 0; i < n; i++) cellStart[i] = Math.floor(R() * 1e6);
    rebuild();
  }
  function rebuild() {
    if (!lum) return; const nb = +$("bands").value, bl = $("blank").value / 100, n = cols * rows;
    band = new Int8Array(n); rankRow = new Int32Array(n); const cnt = [0, 0, 0];
    for (let i = 0; i < n; i++) { const l = lum[i]; if (l < bl) { band[i] = -1; continue; } const b = Math.min(nb - 1, Math.floor(l * nb)); band[i] = b; rankRow[i] = cnt[b]++; }
    dirty = true;
  }
  let PX = 0, PY = 0;
  function draw(step) {
    const phi = $("tilt").value * Math.PI / 180, psi = $("yaw").value * Math.PI / 180;
    const cP = Math.cos(phi), sP = Math.sin(phi), cY = Math.cos(psi), sY = Math.sin(psi), f = +$("persp").value === 0 ? 1e7 : H * (+$("persp").value / 10);
    const Hp = rows * chh, Wp = cols * cw, mode = $("mode").value, dir = $("rev").checked ? -1 : 1, mono = $("cmode").value === "mono";
    // Plane point (x right, y up, from the centre): turn about the vertical axis, then tilt about the horizontal one.
    const rot = (x, y) => { const z1 = x * sY; return [x * cY, y * cP - z1 * sP, y * sP + z1 * cP]; };
    const cs = [rot(-Wp / 2, Hp / 2), rot(Wp / 2, Hp / 2), rot(-Wp / 2, -Hp / 2), rot(Wp / 2, -Hp / 2)];
    const zmin = Math.min(...cs.map(p => p[2]));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of cs) { const s = f / (f + p[2] - zmin), X = p[0] * s, Y = -p[1] * s; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    const k = Math.min(1, (W - 24) / (x1 - x0), (H - 24) / (y1 - y0)); // shrink to fit when the angle would crop it
    const ox = W / 2 - k * (x0 + x1) / 2, oy = H / 2 - k * (y0 + y1) / 2;
    const proj = (x, y) => { const p = rot(x, y), s = f / (f + p[2] - zmin); PX = ox + k * p[0] * s; PY = oy - k * p[1] * s; };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = $("bg").value; ctx.fillRect(0, 0, W, H);
    ctx.font = FONT.replace("SIZE", Math.round(chh * 0.95)); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const fg = $("fg").value; ctx.fillStyle = fg; const lineStep = Math.floor(step / 4);
    for (let r = 0; r < rows; r++) {
      const y = Hp / 2 - (r + .5) * chh;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, b = band[i]; if (b < 0) continue;
        const body = bodies[b], L = body.length; let k;
        if (mode === "cols") k = colStart[c] + r - dir * step;
        else if (mode === "rows") k = rankRow[i] + dir * step;
        else if (mode === "cell") k = cellStart[i] + dir * step;
        else k = (r - dir * lineStep) * cols + c;
        const ch = body[((k % L) + L) % L]; if (ch === " ") continue;
        const x = (c + .5) * cw - Wp / 2;
        proj(x, y); const e0 = PX, f0 = PY;
        proj(x + 1, y); const a0 = PX - e0, b0 = PY - f0;
        proj(x, y - 1); const c0 = PX - e0, d0 = PY - f0;
        let al = mono ? 0.25 + 0.75 * lum[i] : 1, col = mono ? fg : css[i];
        ctx.globalAlpha = al; ctx.fillStyle = col;
        ctx.setTransform(a0, b0, c0, d0, e0, f0); ctx.fillText(ch, 0, 0);
      }
    }
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  $("img").addEventListener("change", loadImg);
  $("cell").addEventListener("input", resample);
  ["bands", "blank"].forEach(id => $(id).addEventListener("input", rebuild));
  ["t0", "t1", "t2"].forEach(id => $(id).addEventListener("input", () => { prepText(); dirty = true; }));
  ["tilt", "yaw", "persp", "speed", "mode", "rev", "cmode", "bg", "fg"].forEach(id => $(id).addEventListener("input", () => dirty = true));
  $("axo").addEventListener("click", () => { $("tilt").value = 35; $("yaw").value = 45; $("persp").value = 0; $("sweep").value = "off"; dirty = true; });
  const panel = $("panel");
  $("grab").addEventListener("click", () => { const c = panel.classList.toggle("collapsed"); $("grab").setAttribute("aria-expanded", String(!c)); });
  window.addEventListener("keydown", e => {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.key === "d" || e.key === "D") { panel.classList.toggle("hidden"); document.body.classList.toggle("nopanel"); }
  });
  function out() { ["tilt", "yaw", "persp", "speed", "cell", "bands", "blank"].forEach(id => $("o_" + id).textContent = $(id).value); }
  prepText(); out(); loadImg();
  if (document.fonts && document.fonts.load) document.fonts.load('italic 400 20px "IBM Plex Mono"').then(() => dirty = true);
  function tick(now) {
    const sw = $("sweep").value;
    if (sw === "tilt" || sw === "both") { const p = (now / 8000) % 1; $("tilt").value = Math.round(75 * (0.5 - 0.5 * Math.cos(p * 2 * Math.PI))); dirty = true; }
    if (sw === "yaw" || sw === "both") { const p = (now / 11000) % 1; $("yaw").value = Math.round(75 * (0.5 - 0.5 * Math.cos(p * 2 * Math.PI))); dirty = true; }
    out(); const step = Math.floor(now / 1000 * $("speed").value);
    if (lum && (dirty || step !== lastStep)) { lastStep = step; dirty = false; draw(step); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
