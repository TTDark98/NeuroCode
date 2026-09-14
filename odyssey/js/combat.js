/* ============================================================
   ODYSSEY — combat.js
   Two owners live here:
   1) Cinematic — sword/arrow ATTACK EFFECTS drawn over the scene
      (slash arcs, sparks, arrow trails, impact flashes, hit-stop).
   2) FilmIntro — the film-style opening: the Trojan Horse night,
      the reveal, the title cards. Skippable, non-interactive.
   ============================================================ */

import { PAL } from "./art.js";
import { Fx } from "./fx.js";
import { Voice } from "./voice.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const Cinematic = {
  slashes: [],   // { x,y,dir,t,life,big }
  sparks: [],    // { x,y,vx,vy,t,life,c }
  trails: [],    // arrow trails { x,y,x2,y2,t,life }
  rings: [],     // impact shockwaves { x,y,r,maxR,t,life,c }

  /** a sword slash arc at (x,y); dir ±1; big=true for heavy blows */
  slash(x, y, dir, big = false) {
    this.slashes.push({ x, y, dir, t: 0, life: big ? 0.30 : 0.22, big });
    const n = big ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? -0.9 : Math.PI + 0.9) + (Math.random() - 0.5) * 1.6;
      const sp = 120 + Math.random() * (big ? 300 : 190);
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        t: 0, life: 0.28 + Math.random() * 0.3,
        c: Math.random() < 0.35 ? PAL.fireBright : PAL.bronzeBright,
      });
    }
  },

  /** fast arrow trail segment spawned by scenefw on each arrow frame */
  arrowTrail(x, y, x2, y2) {
    this.trails.push({ x, y, x2, y2, t: 0, life: 0.16 });
  },

  /** bronze impact: shockwave ring + sparks + flash */
  impact(x, y, c = PAL.bronzeBright, big = false) {
    this.rings.push({ x, y, r: 6, maxR: big ? 64 : 40, t: 0, life: big ? 0.38 : 0.26, c });
    for (let i = 0; i < (big ? 14 : 8); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * (big ? 260 : 170);
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        t: 0, life: 0.25 + Math.random() * 0.35,
        c: Math.random() < 0.5 ? c : PAL.fireBright,
      });
    }
    Fx.hit(big ? 0.75 : 0.5);
  },

  update(dt) {
    for (const s of this.slashes) s.t += dt;
    this.slashes = this.slashes.filter((s) => s.t < s.life);
    for (const p of this.sparks) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 620 * dt;
    }
    this.sparks = this.sparks.filter((p) => p.t < p.life);
    for (const tr of this.trails) tr.t += dt;
    this.trails = this.trails.filter((tr) => tr.t < tr.life);
    for (const r of this.rings) { r.t += dt; r.r += (r.maxR - r.r) * Math.min(1, dt * 10); }
    this.rings = this.rings.filter((r) => r.t < r.life);
  },

  draw(ctx) {
    // arrow trails — quick fading shafts of motion
    ctx.save();
    ctx.lineCap = "round";
    for (const tr of this.trails) {
      const k = 1 - tr.t / tr.life;
      ctx.globalAlpha = k * 0.55;
      ctx.strokeStyle = PAL.boneDim;
      ctx.lineWidth = 2.4 * k + 0.6;
      ctx.beginPath(); ctx.moveTo(tr.x, tr.y); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
    }
    // slash arcs — two crescent strokes, thick then thin
    for (const s of this.slashes) {
      const k = s.t / s.life;
      const a = Math.sin(k * Math.PI); // in-out
      const R = s.big ? 58 : 42;
      const sweep = (2.3 - k * 1.4);
      ctx.globalAlpha = a * 0.95;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.dir, 1);
      ctx.rotate(-0.7 + k * 0.9);
      ctx.strokeStyle = PAL.bone;
      ctx.lineWidth = s.big ? 9 : 6;
      ctx.beginPath(); ctx.arc(0, 0, R, -sweep / 2, sweep / 2); ctx.stroke();
      ctx.strokeStyle = PAL.fireBright;
      ctx.lineWidth = s.big ? 3.4 : 2.2;
      ctx.beginPath(); ctx.arc(0, 0, R - 8, -sweep / 2 + 0.12, sweep / 2 - 0.12); ctx.stroke();
      ctx.restore();
    }
    // impact rings
    for (const r of this.rings) {
      const k = 1 - r.t / r.life;
      ctx.globalAlpha = k * 0.9;
      ctx.strokeStyle = r.c;
      ctx.lineWidth = 5 * k + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    // sparks — warm dots with gravity
    for (const p of this.sparks) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + 2.2 * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  clear() { this.slashes = []; this.sparks = []; this.trails = []; this.rings = []; },
};

/* ============================================================
   FilmIntro — the opening the user asked for: the Trojan Horse,
   told like the film. Cinematic letterbox, slow shots, title
   cards, then hands off to the prologue scene. Skippable.
   ============================================================ */

const SHOTS = [
  { id: "card",  dur: 3.2, line: "TROY — THE TENTH YEAR OF THE WAR" },
  { id: "siege", dur: 4.6, voice: "Ten years the war ground on, and the walls of Priam never fell." },
  { id: "card",  dur: 2.6, line: "The city could not be taken by force." },
  { id: "beach", dur: 4.4, voice: "So the Greeks burned their camps, and pretended to sail for home." },
  { id: "horse", dur: 5.6, voice: "All that they left behind... was a gift." },
  { id: "wheel", dur: 4.6, voice: "The Trojans dragged their doom through their own gates — singing." },
  { id: "night", dur: 3.2, voice: "That night, Troy slept without a watch." },
  { id: "sack",  dur: 5.0, voice: "And from the belly of the horse, the heroes woke." },
  { id: "card",  dur: 4.2, line: "ODYSSEY" },
];

export class FilmIntro {
  constructor(engine, audio, onDone) {
    this.eng = engine;
    this.audio = audio;
    this.onDone = onDone;
    this.t = 0;
    this.i = 0;
    this.done = false;
    this._bar = 0;              // letterbox animation 0..1
    this._fired = new Set();    // one-shot audio cues per shot
    audio.playChapterMusic(0);  // the doomed Troy dirge under everything
  }

  skip() { this._finish(); }

  /** tap anywhere (engine routes quick taps here) */
  onTap() { this.skip(); }

  /** progress total time; index of the current shot */
  update(dt) {
    this.t += dt;
    this._bar = Math.min(1, this._bar + dt * 2);
    let shot = SHOTS[this.i];
    while (shot && this.t > shot.dur) {
      this.t -= shot.dur;
      this.i++;
      this._fired.delete("cue");
      shot = SHOTS[this.i];
    }
    if (!shot) { this._finish(); return; }
    if (!this._fired.has("cue")) {
      this._fired.add("cue");
      if (shot.voice) { try { Voice.say("NARRATOR", shot.voice); } catch {} }
      if (shot.id === "horse") this.audio.sfx("reveal");
      if (shot.id === "wheel") this.audio.sfx("thud");
      if (shot.id === "sack") { this.audio.sfx("roar"); this.eng.shake(2.2); }
      if (shot.id === "card" && shot.line === "ODYSSEY") this.audio.sfx("reveal");
    }
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this.onDone && this.onDone();
  }

  /* ---------------- drawing ---------------- */

  draw(ctx) {
    const W = this.eng.W, H = this.eng.H;
    const shot = SHOTS[this.i] || { id: "card", line: "" };
    const k = this.t / shot.dur; // 0..1 through the current shot

    // base night
    ctx.fillStyle = "#0a0604";
    ctx.fillRect(0, 0, W, H);
    if (shot.id === "card") {
      this._drawCard(ctx, W, H, shot.line, k);
    } else {
      // slow cinematic push-in on every live shot
      const cam = 1 + 0.10 * k;
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(cam, cam); ctx.translate(-W / 2, -H / 2);
      if (shot.id === "siege") this._drawSiege(ctx, W, H, k);
      else if (shot.id === "beach") this._drawBeach(ctx, W, H, k);
      else if (shot.id === "horse") this._drawHorse(ctx, W, H, k);
      else if (shot.id === "wheel") this._drawWheel(ctx, W, H, k);
      else if (shot.id === "night") this._drawNight(ctx, W, H, k);
      else if (shot.id === "sack") this._drawSack(ctx, W, H, k);
      ctx.restore();
    }

    // letterbox bars + fade
    const bar = H * 0.11 * this._bar;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    // gentle fade-in of each shot
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 0.85 - k * 4)})`;
    ctx.fillRect(0, 0, W, H);
    // skip hint
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(this.t * 3) * 0.15;
    ctx.fillStyle = PAL.boneDim;
    ctx.font = "13px Georgia, serif";
    ctx.textAlign = "right";
    ctx.fillText("tap to skip ▸", W - 18, H - bar - 14);
    ctx.restore();
  }

  _title(ctx, cx, cy, text, size, alpha, color = PAL.bone, maxW) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    // shrink to fit the viewport (long card lines must never clip)
    if (maxW) {
      let fs = size;
      do { ctx.font = `${fs}px Georgia, serif`; if (ctx.measureText(text).width <= maxW) break; fs -= 1; } while (fs > 10);
    } else {
      ctx.font = `${size}px Georgia, serif`;
    }
    ctx.textAlign = "center";
    ctx.letterSpacing = maxW ? "3px" : "6px";
    ctx.fillText(text, cx, cy);
    ctx.letterSpacing = "0px";
    ctx.restore();
  }

  _drawCard(ctx, W, H, line, k) {
    const a = Math.min(1, k * 3) * Math.min(1, (1 - k) * 3.2);
    const big = line === "ODYSSEY";
    if (big) {
      this._title(ctx, W / 2, H * 0.46, "O D Y S S E Y", Math.min(64, W * 0.13), a, PAL.bone, W * 0.9);
      this._title(ctx, W / 2, H * 0.55, "the long way home", Math.min(18, W * 0.04), a * 0.8, PAL.boneDim, W * 0.9);
      // meander rules
      ctx.save();
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = PAL.bronze;
      ctx.lineWidth = 2;
      const w2 = Math.min(220, W * 0.3);
      for (const yy of [H * 0.36, H * 0.60]) {
        ctx.beginPath(); ctx.moveTo(W / 2 - w2, yy); ctx.lineTo(W / 2 + w2, yy); ctx.stroke();
      }
      ctx.restore();
    } else {
      this._title(ctx, W / 2, H * 0.5, line, Math.min(24, W * 0.05), a, PAL.boneDim, W * 0.9);
    }
  }

  /** THE HORSE — the Walk from the beach, torches right, embers */
  _drawHorse(ctx, W, H, k) {
    const gy = H * 0.86;
    const g = ctx.createRadialGradient(W * 0.7, gy - H * 0.3, 10, W * 0.7, gy - H * 0.3, H * 0.55);
    g.addColorStop(0, "rgba(226,110,40,0.42)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // city wall across the background with the gate
    ctx.fillStyle = "rgba(16,9,5,0.92)";
    const wy = gy - H * 0.05;
    ctx.fillRect(W * 0.45, wy - H * 0.17, W * 0.62, H * 0.17);
    for (let i = 0; i < 5; i++) ctx.fillRect(W * (0.5 + i * 0.11), wy - H * 0.22, W * 0.035, H * 0.05);
    ctx.fillRect(0, wy, W, H - wy);
    // ground
    ctx.fillStyle = "#120a06";
    ctx.fillRect(0, gy, W, H - gy);
    // the horse walks in from the left (deep chest, arched neck, head down)
    const s = Math.min(W, H) / 440;
    const cx = W * (0.02 + k * 0.22);
    this._horse(ctx, cx, gy - 4, s, this.t);
    // Trojan torches at the gate (right)
    for (let i = 0; i < 5; i++) {
      const tx = W * (0.6 + i * 0.07), ty = gy - 2;
      const fl = 3 + Math.sin(this.t * 9 + i * 2) * 1.5;
      ctx.fillStyle = "rgba(240,160,70,0.9)";
      ctx.beginPath(); ctx.arc(tx, ty - fl * 2.2, fl, 0, Math.PI * 2); ctx.fill();
    }
    this._embers(ctx, W, H, 22);
  }

  _embers(ctx, W, H, n) {
    for (let i = 0; i < n; i++) {
      const ex = (i * 97.3) % W;
      const ey = (H - ((this.t * (16 + (i % 9)) + i * 53) % H));
      ctx.globalAlpha = 0.35 + Math.sin(i + this.t) * 0.25;
      ctx.fillStyle = PAL.fireBright;
      ctx.fillRect(ex, ey, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /** THE HORSE ITSELF — correct anatomy: deep chest FORWARD, arched neck
   *  rising from the front, head angled DOWN, tail hanging at the rear.
   *  Facing right; plank seams, belly hatch, fire rim on the left. */
  _horse(ctx, cx, gy, s, t) {
    ctx.save();
    ctx.translate(cx, gy);
    ctx.scale(s, s);
    const ink = "#0c0806";
    const bob = Math.sin(t * 1.7) * 1.6; // breathing
    ctx.translate(0, bob);
    // tail — hangs DOWN from the rump
    ctx.strokeStyle = ink; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-80, -136); ctx.quadraticCurveTo(-95, -100, -88, -58); ctx.stroke();
    // far-side legs (lighter ink — depth)
    ctx.fillStyle = "#161009";
    ctx.fillRect(-40, -62, 12, 62); ctx.fillRect(62, -60, 11, 60);
    // barrel: deep chest at the FRONT, rounded rump at the back
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(-62, -58);
    ctx.quadraticCurveTo(-86, -66, -88, -100);   // under the haunch
    ctx.quadraticCurveTo(-91, -140, -62, -154);  // rump
    ctx.quadraticCurveTo(-36, -166, -2, -164);   // croup
    ctx.quadraticCurveTo(24, -168, 44, -158);    // withers
    ctx.quadraticCurveTo(60, -150, 70, -132);    // into the neck base
    ctx.quadraticCurveTo(88, -118, 90, -96);     // broad chest front
    ctx.quadraticCurveTo(91, -72, 68, -60);      // chest bottom
    ctx.quadraticCurveTo(28, -54, -8, -57);      // belly
    ctx.closePath(); ctx.fill();
    // near-side legs — fore pair at the chest, hind pair at the haunch
    ctx.fillStyle = ink;
    ctx.fillRect(-60, -64, 15, 64); ctx.fillRect(-30, -60, 13, 60);
    ctx.fillRect(42, -64, 15, 64); ctx.fillRect(72, -58, 12, 58);
    // hooves
    ctx.fillRect(-60, -8, 15, 8); ctx.fillRect(-30, -8, 13, 8);
    ctx.fillRect(42, -8, 15, 8); ctx.fillRect(72, -8, 12, 8);
    // NECK — arches up-forward from the withers/chest
    ctx.beginPath();
    ctx.moveTo(28, -158);
    ctx.quadraticCurveTo(62, -180, 86, -208);    // top of the arch
    ctx.lineTo(108, -196);                       // poll
    ctx.quadraticCurveTo(100, -174, 82, -156);   // down the throat
    ctx.quadraticCurveTo(66, -138, 48, -132);    // into the chest
    ctx.closePath(); ctx.fill();
    // HEAD — angled down-forward (grazing pose reads instantly "horse")
    ctx.save();
    ctx.translate(96, -202);
    ctx.rotate(0.55);
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.quadraticCurveTo(18, -12, 40, 0);        // face top to the muzzle
    ctx.quadraticCurveTo(46, 5, 38, 11);         // nose
    ctx.quadraticCurveTo(16, 14, -6, 9);         // jaw
    ctx.closePath(); ctx.fill();
    // ears
    ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(3, -24); ctx.lineTo(9, -7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(-6, -21); ctx.lineTo(-1, -8); ctx.closePath(); ctx.fill();
    ctx.restore();
    // mane — ridge of short planks along the neck top
    ctx.strokeStyle = "#1c1410"; ctx.lineWidth = 5; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const mx = 34 + i * 10, my = -162 - i * 7.5;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 6, my - 9); ctx.stroke();
    }
    ctx.lineCap = "butt";
    // plank seams — the wooden build
    ctx.strokeStyle = "rgba(28,20,16,0.9)"; ctx.lineWidth = 2.4;
    for (const px of [-42, -8, 26, 54]) {
      ctx.beginPath(); ctx.moveTo(px, -160); ctx.quadraticCurveTo(px + 3, -108, px - 2, -58); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(28,20,16,0.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-70, -66); ctx.lineTo(72, -62); ctx.stroke(); // belly seam
    // the hatch — trap door on the flank with its ring
    ctx.strokeStyle = "rgba(28,20,16,0.95)"; ctx.lineWidth = 3;
    ctx.strokeRect(-2, -102, 36, 28);
    ctx.strokeStyle = "rgba(240,160,70,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(26, -88, 5, 0, Math.PI * 2); ctx.stroke();
    // firelight rim along the fire-side (left) edge
    ctx.strokeStyle = "rgba(240,150,60,0.5)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-88, -100); ctx.quadraticCurveTo(-91, -140, -62, -154); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-62, -154); ctx.quadraticCurveTo(-36, -166, -2, -164); ctx.stroke();
    ctx.restore();
  }

  /** the siege — Troy's walls at night, war-fires at the base */
  _drawSiege(ctx, W, H, k) {
    const gy = H * 0.82;
    // fires along the wall base
    const g = ctx.createRadialGradient(W * 0.5, gy, 10, W * 0.5, gy, H * 0.5);
    g.addColorStop(0, "rgba(226,110,40,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // the great wall with towers
    ctx.fillStyle = "rgba(18,10,6,0.95)";
    const wy = gy - H * 0.20;
    ctx.fillRect(0, wy, W, H * 0.20);
    for (let i = 0; i < 4; i++) {
      const tx = W * (0.12 + i * 0.24);
      ctx.fillRect(tx, wy - H * 0.09, W * 0.055, H * 0.09);
      // tower crenellation
      for (let m = 0; m < 3; m++) ctx.fillRect(tx + m * W * 0.02, wy - H * 0.105, W * 0.012, H * 0.015);
    }
    // wall seams
    ctx.strokeStyle = "rgba(40,24,12,0.5)"; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const sx = W * (0.04 + i * 0.115);
      ctx.beginPath(); ctx.moveTo(sx, wy + 6); ctx.lineTo(sx, gy); ctx.stroke();
    }
    // Greek camp fires on the plain (the siege that never broke)
    for (let i = 0; i < 7; i++) {
      const fx = W * (0.06 + i * 0.14), fy = gy + H * 0.045;
      const fl = 3 + Math.sin(this.t * 7 + i * 2.2) * 1.6;
      ctx.fillStyle = "rgba(240,150,60,0.85)";
      ctx.beginPath(); ctx.ellipse(fx, fy, fl * 1.6, fl, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#0d0805"; ctx.fillRect(0, gy + H * 0.06, W, H);
    this._embers(ctx, W, H, 14);
  }

  /** the beach — the fleet "sails away", the horse waits on the shore */
  _drawBeach(ctx, W, H, k) {
    const horizon = H * 0.46;
    // moon
    ctx.fillStyle = "rgba(236,223,195,0.9)";
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.16, H * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0604";
    ctx.beginPath(); ctx.arc(W * 0.795, H * 0.15, H * 0.032, 0, Math.PI * 2); ctx.fill();
    // sea glint
    ctx.fillStyle = "rgba(90,110,120,0.35)";
    ctx.fillRect(0, horizon, W, H * 0.012);
    // ships leaving on the horizon
    ctx.fillStyle = "#120c07";
    for (let i = 0; i < 3; i++) {
      const sx = W * (0.14 + i * 0.09) - k * W * 0.03 * (i + 1);
      const sy = horizon + 2 + i * 3;
      ctx.beginPath();
      ctx.moveTo(sx - 16, sy); ctx.quadraticCurveTo(sx, sy + 5, sx + 16, sy); ctx.lineTo(sx + 12, sy + 4);
      ctx.quadraticCurveTo(sx, sy + 8, sx - 12, sy + 4); ctx.closePath(); ctx.fill();
      ctx.fillRect(sx - 1, sy - 12, 2, 12);
    }
    ctx.fillStyle = "#100a06"; ctx.fillRect(0, horizon + H * 0.014, W, H);
    // the horse on the shore, distant, waiting
    const gy = H * 0.86;
    this._horse(ctx, W * 0.55, gy, Math.min(W, H) / 900, this.t);
    // beach campfires (the empty camp)
    for (let i = 0; i < 5; i++) {
      const fx = W * (0.08 + i * 0.07), fy = gy - 2;
      const fl = 2.5 + Math.sin(this.t * 8 + i * 2) * 1.2;
      ctx.fillStyle = "rgba(240,150,60,0.8)";
      ctx.beginPath(); ctx.arc(fx, fy - fl, fl, 0, Math.PI * 2); ctx.fill();
    }
    this._embers(ctx, W, H, 10);
  }

  /** the night watch — moonlit horse in the gate plaza, city asleep */
  _drawNight(ctx, W, H, k) {
    const gy = H * 0.85;
    // stars
    for (let i = 0; i < 40; i++) {
      const sx = (i * 149.7) % W, sy = ((i * 83.1) % (H * 0.5));
      ctx.globalAlpha = 0.3 + Math.sin(i * 3 + this.t * 1.5) * 0.25;
      ctx.fillStyle = PAL.bone;
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    // crescent moon
    ctx.fillStyle = "rgba(236,223,195,0.85)";
    ctx.beginPath(); ctx.arc(W * 0.2, H * 0.14, H * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0604";
    ctx.beginPath(); ctx.arc(W * 0.215, H * 0.132, H * 0.027, 0, Math.PI * 2); ctx.fill();
    // sleeping houses (one warm window)
    ctx.fillStyle = "rgba(14,9,6,0.95)";
    for (let i = 0; i < 6; i++) {
      const bw = W * 0.11, bh = H * (0.08 + ((i * 31) % 4) * 0.02);
      ctx.fillRect(i * bw * 1.02 + W * 0.3, gy - bh, bw * 0.9, bh);
    }
    ctx.fillStyle = `rgba(240,180,90,${0.5 + Math.sin(this.t * 2) * 0.15})`;
    ctx.fillRect(W * 0.52, gy - H * 0.065, 5, 7);
    ctx.fillStyle = "#0f0a06"; ctx.fillRect(0, gy, W, H - gy);
    // the horse — moonlit rim, torches dead
    const s = Math.min(W, H) / 480;
    this._horse(ctx, W * 0.5, gy - 4, s, this.t);
    // one watcher's torch approaching, far right
    const fl = 3 + Math.sin(this.t * 10) * 1.2;
    ctx.fillStyle = "rgba(240,160,70,0.9)";
    ctx.beginPath(); ctx.arc(W * 0.9, gy - fl * 2, fl, 0, Math.PI * 2); ctx.fill();
  }

  /** the wheel — great wheel dragged through a gate, rope taut, slow */
  _drawWheel(ctx, W, H, k) {
    const gy = H * 0.88;
    const cx = W * (0.30 + k * 0.10);
    // gate posts
    ctx.fillStyle = "#160d07";
    ctx.fillRect(W * 0.55, gy - H * 0.34, W * 0.05, H * 0.34);
    ctx.fillRect(W * 0.72, gy - H * 0.36, W * 0.05, H * 0.36);
    ctx.fillStyle = "#0e0805";
    ctx.fillRect(W * 0.55, gy - H * 0.30, W * 0.22, H * 0.30);
    // ground
    ctx.fillStyle = "#100906";
    ctx.fillRect(0, gy, W, H - gy);
    // the wheel
    const R = H * 0.20;
    ctx.strokeStyle = "#241812";
    ctx.lineWidth = R * 0.16;
    ctx.beginPath(); ctx.arc(cx, gy - R, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = R * 0.09;
    for (let i = 0; i < 6; i++) {
      const a = this.t * 0.5 + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R * 0.9, gy - R + Math.sin(a) * R * 0.9);
      ctx.lineTo(cx - Math.cos(a) * R * 0.9, gy - R - Math.sin(a) * R * 0.9);
      ctx.stroke();
    }
    // ropes up to the horse (offscreen weight)
    ctx.strokeStyle = "rgba(120,86,50,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 8, gy - R * 1.9); ctx.lineTo(W * 0.60, gy - H * 0.52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10, gy - R * 1.88); ctx.lineTo(W * 0.64, gy - H * 0.50); ctx.stroke();
    // torch flare on the wheel
    const fl = 6 + Math.sin(this.t * 11) * 2;
    ctx.fillStyle = "rgba(240,160,70,0.85)";
    ctx.beginPath(); ctx.arc(cx + R * 0.7, gy - R * 1.7, fl, 0, Math.PI * 2); ctx.fill();
  }

  /** the sack — silhouettes pouring from the horse's belly, city burning */
  _drawSack(ctx, W, H, k) {
    const gy = H * 0.84;
    const g = ctx.createRadialGradient(W * 0.5, gy - H * 0.3, 10, W * 0.5, gy - H * 0.3, H * 0.55);
    g.addColorStop(0, "rgba(226,110,40,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // the horse, huge
    const s = Math.min(W, H) / 430;
    const hx = W * 0.5, hy = gy - H * 0.10;
    this._horse(ctx, hx, hy, s, this.t);
    // the hatch — OPEN, firelight spilling out (hatch is at local (-2..34, -102..-74))
    const openK = Math.min(1, k * 5);
    const hcx = hx + 16 * s, hcy = hy - 88 * s;
    ctx.save();
    ctx.globalAlpha = openK;
    ctx.fillStyle = "rgba(240,150,60,0.9)";
    ctx.fillRect(hx + 0 * s, hy - 102 * s, 34 * s * openK, 28 * s);
    const hg = ctx.createRadialGradient(hcx, hcy, 2, hcx, hcy, 70 * s);
    hg.addColorStop(0, "rgba(240,150,60,0.5)");
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(hcx - 70 * s, hcy - 70 * s, 140 * s, 140 * s);
    ctx.restore();
    // men pouring out — from the hatch down the rope to the ground
    const n = 8;
    for (let i = 0; i < n; i++) {
      const kk = clamp((k * 1.7 - i * 0.085) % 1, 0, 1);
      const mx = hcx + kk * W * 0.10;
      const my = hcy + kk * (gy - hcy);
      ctx.save();
      ctx.translate(mx, my);
      ctx.fillStyle = "#0c0806";
      ctx.fillRect(-2.5, 0, 5, 12);          // body
      ctx.beginPath(); ctx.arc(0, -3, 3, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillRect(2, 2, 8, 2);              // spear arm
      ctx.restore();
    }
    // burning rooftops far right
    ctx.fillStyle = "rgba(16,9,5,0.9)";
    for (let i = 0; i < 6; i++) {
      const bw = W * 0.07, bh = H * (0.10 + ((i * 23) % 4) * 0.02);
      ctx.fillRect(W * 0.62 + i * bw, gy - bh, bw * 0.85, bh);
    }
    this._embers(ctx, W, H, 18);
  }
}
