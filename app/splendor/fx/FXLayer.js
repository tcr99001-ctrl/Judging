// app/splendor/fx/FXLayer.js
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFX, useFXSubscribe } from './FXProvider';

/**
 * FXLayer
 * - DOM sprite pools (card/token/text) + single Canvas particles
 * - No ghost sprites: release() resets display:none + innerHTML cleanup
 * - No stealing: acquire() returns null if pool exhausted
 * - No debug text: removes DECK/REVEAL/R labels (mobile-game style)
 * - Card flip includes card-pack back pattern + shine sweep
 */

const Z = 45;
const TOKEN_POOL = 24;
const CARD_POOL = 18;
const TEXT_POOL = 12;

const DUR = {
  fly: 220,
  slide: 180,
  flip: 170,
  pop: 160,
  shake: 140,
  ceremony: 320,
  victory: 560,
  turnWave: 140,
  highlight: 100,
};

const COLOR_MAP = {
  white: '#e5e7eb',
  blue: '#60a5fa',
  green: '#34d399',
  red: '#f87171',
  black: '#9ca3af',
  gold: '#fbbf24',
  w: '#e5e7eb',
  u: '#60a5fa',
  g: '#34d399',
  r: '#f87171',
  k: '#9ca3af',
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function bezierPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}
function makeControlPoint(a, b) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const lift = clamp(dist * 0.18, 28, 90);
  return { x: mx, y: my - lift };
}

/** ===== Canvas Particles ===== */
function createParticleBurst(x, y, opts = {}) {
  const count = opts.count ?? 10;
  const speed = opts.speed ?? 220;
  const spread = opts.spread ?? Math.PI * 2;
  const life = opts.life ?? 360;
  const gravity = opts.gravity ?? 440;
  const color = opts.color ?? '#ffffff';

  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * spread + (Math.random() * 0.35 - 0.175);
    const s = speed * (0.6 + Math.random() * 0.6);
    out.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - speed * 0.18,
      born: nowMs(),
      life,
      gravity,
      color,
      r: 1.2 + Math.random() * 2.4,
    });
  }
  return out;
}

/** ===== DOM Sprite Pool ===== */
function createDivPool(count, className) {
  const arr = new Array(count);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = className;
    el.style.position = 'absolute';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.transform = 'translate(-9999px, -9999px)';
    el.style.willChange = 'transform, opacity';
    el.style.pointerEvents = 'none';
    el.style.opacity = '0';
    el.style.display = 'none';
    el.dataset.fxBusy = '0';
    el._fxAnim = null;
    arr[i] = el;
  }
  return arr;
}

function cancelAnyAnim(el) {
  const a = el?._fxAnim;
  if (a && typeof a.cancel === 'function') {
    try { a.cancel(); } catch {}
  }
  el._fxAnim = null;
}

function acquire(pool) {
  if (!pool || pool.length === 0) return null;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].dataset.fxBusy === '0') {
      pool[i].dataset.fxBusy = '1';
      cancelAnyAnim(pool[i]);
      return pool[i];
    }
  }
  return null; // ✅ steal 금지
}

function release(el) {
  if (!el) return;
  cancelAnyAnim(el);
  el.dataset.fxBusy = '0';
  el.style.opacity = '0';
  el.style.transform = 'translate(-9999px, -9999px)';
  el.style.display = 'none';
  el.textContent = '';
  el.innerHTML = '';
}

function tokenStyle(colorKey) {
  const c = COLOR_MAP[colorKey] || '#ffffff';
  return {
    width: '18px',
    height: '18px',
    borderRadius: '999px',
    background: c,
    boxShadow: '0 4px 10px rgba(0,0,0,0.16)',
    border: '1px solid rgba(255,255,255,0.35)',
  };
}

// ✅ Non-transparent card sprite (mobile-game look)
function cardStyle(tier) {
  const base = {
    width: '54px',
    height: '74px',
    borderRadius: '14px',
    boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
    border: '1px solid rgba(0,0,0,0.08)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(230,230,230,0.92))',
  };

  if (tier === 3) {
    return { ...base, background: 'linear-gradient(135deg, rgba(255,230,230,0.96), rgba(255,255,255,0.94))' };
  }
  if (tier === 2) {
    return { ...base, background: 'linear-gradient(135deg, rgba(225,238,255,0.96), rgba(255,255,255,0.94))' };
  }
  return base;
}

export default function FXLayer() {
  const fx = useFX();

  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  const tokenPoolRef = useRef(null);
  const cardPoolRef = useRef(null);
  const textPoolRef = useRef(null);

  const particlesRef = useRef([]);
  const rafRef = useRef(0);
  const lastSizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const [overlayMode, setOverlayMode] = useState('none'); // 'none' | 'ceremony' | 'victory'
  const overlayTimeoutRef = useRef(0);

  const reduced = !!fx.reducedMotion;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tokenPool = createDivPool(TOKEN_POOL, 'fx-token');
    const cardPool = createDivPool(CARD_POOL, 'fx-card');
    const textPool = createDivPool(TEXT_POOL, 'fx-text');

    tokenPoolRef.current = tokenPool;
    cardPoolRef.current = cardPool;
    textPoolRef.current = textPool;

    for (const el of [...tokenPool, ...cardPool, ...textPool]) {
      root.appendChild(el);
    }

    return () => {
      for (const el of [...tokenPool, ...cardPool, ...textPool]) {
        try { el.remove(); } catch {}
      }
      tokenPoolRef.current = null;
      cardPoolRef.current = null;
      textPoolRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = clamp((window.devicePixelRatio || 1), 1, 2);
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const prev = lastSizeRef.current;
      if (prev.w === w && prev.h === h && prev.dpr === dpr) return;

      lastSizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, []);

  useFXSubscribe(() => {
    const events = fx.drain(9999);
    if (!events.length) return;
    for (const e of events) {
      try {
        handleEvent(e);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[FXLayer] event error', e, err);
      }
    }
  });

  function handleEvent(evt) {
    const type = evt.type;
    const p = evt.payload || {};

    switch (type) {
      case 'CARD_FLY_TO_PLAYER': return fxCardFly(p);
      case 'GEM_BURST_TO_PLAYER': return fxGemBurst(p);
      case 'CARD_SLIDE_IN': return fxCardSlideIn(p);
      case 'CARD_REVEAL_FLIP': return fxCardFlip(p);

      case 'NOBLE_CEREMONY': return fxNobleCeremony(p);
      case 'TURN_WAVE': return fxTurnWave(p);

      case 'BUY_FAIL_SHAKE': return fxShake(p);
      case 'SCORE_POP': return fxScorePop(p);

      case 'VICTORY_BURST': return fxVictory(p);

      case 'CARD_PICK_HIGHLIGHT': return fxPickHighlight(p);

      default: return;
    }
  }

  function rectOrNull(keyOrRect) {
    if (!keyOrRect) return null;
    if (typeof keyOrRect === 'object' && keyOrRect.cx != null) return keyOrRect;
    if (typeof keyOrRect === 'string') return fx.getAnchorRect(keyOrRect);
    return null;
  }
  function centerFrom(rect) {
    return { x: rect.cx, y: rect.cy };
  }

  function fxCardFly(payload) {
    const fromR = rectOrNull(payload.from);
    const toR = rectOrNull(payload.to);
    if (!fromR || !toR) return;

    if (reduced) {
      fxScorePop({ at: toR, text: payload.label || '', tone: 'card' });
      return;
    }

    const el = acquire(cardPoolRef.current);
    if (!el) return;

    el.style.display = 'block';
    el.style.opacity = '1';
      Object.assign(el.style, cardStyle(payload.tier || 1));

    // ✅ 텍스트는 기본적으로 비움(모바일 게임 느낌)
    el.textContent = payload.label ? String(payload.label) : '';
    el.style.display = 'block';

    const a = centerFrom(fromR);
    const b = centerFrom(toR);
    const c = makeControlPoint(a, b);

    const dur = DUR.fly;
    const start = nowMs();

    const tick = () => {
      const t = clamp((nowMs() - start) / dur, 0, 1);
      const tt = easeOutBack(t);
      const pt = bezierPoint(a, c, b, tt);
      const s = 1.08 - 0.18 * t;
      el.style.transform = `translate(${pt.x - 27}px, ${pt.y - 37}px) scale(${s}) rotate(${(1 - t) * -4}deg)`;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        fxParticleBurst(b.x, b.y, { color: 'rgba(255,255,255,0.9)', count: 6, speed: 180 });
        const anim = el.animate(
          [{ transform: el.style.transform, opacity: 1 }, { transform: `translate(${b.x - 27}px, ${b.y - 37}px) scale(0.85)`, opacity: 0 }],
          { duration: 140, easing: 'ease-out', fill: 'forwards' }
        );
        el._fxAnim = anim;
        anim.onfinish = () => release(el);
        window.setTimeout(() => release(el), dur + 320);
      }
    };

    tick();
  }

  function fxGemBurst(payload) {
    const fromR = rectOrNull(payload.from);
    const toR = rectOrNull(payload.to);
    const colors = Array.isArray(payload.colors) ? payload.colors : [];
    if (!fromR || !toR || colors.length === 0) return;

    const a = centerFrom(fromR);
    const b = centerFrom(toR);
    const dur = DUR.fly;

    if (reduced) {
      fxScorePop({ at: toR, text: `+${colors.length}`, tone: 'gem' });
      return;
    }

    for (let i = 0; i < colors.length; i++) {
      const colorKey = colors[i];
      const el = acquire(tokenPoolRef.current);
      if (!el) continue;

      el.style.display = 'block';
      el.style.opacity = '1';
      Object.assign(el.style, tokenStyle(colorKey));

      const jitter = (n) => (Math.random() * 2 - 1) * n;
      const startPt = { x: a.x + jitter(10), y: a.y + jitter(10) };
      const endPt = { x: b.x + jitter(8), y: b.y + jitter(8) };
      const ctrl = makeControlPoint(startPt, endPt);

      const start = nowMs();
      const tick = () => {
        const t = clamp((nowMs() - start) / dur, 0, 1);
        const tt = easeOutBack(t);
        const pt = bezierPoint(startPt, ctrl, endPt, tt);
        const s = 1.0 - t * 0.25;
        el.style.transform = `translate(${pt.x - 9}px, ${pt.y - 9}px) scale(${s})`;
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          fxParticleBurst(endPt.x, endPt.y, { color: COLOR_MAP[colorKey] || '#ffffff', count: 8, speed: 210 });
          const anim = el.animate(
            [{ transform: el.style.transform, opacity: 1 }, { transform: `translate(${endPt.x - 9}px, ${endPt.y - 9}px) scale(0.7)`, opacity: 0 }],
            { duration: 120, easing: 'ease-out', fill: 'forwards' }
          );
          el._fxAnim = anim;
          anim.onfinish = () => release(el);
          window.setTimeout(() => release(el), dur + 260);
        }
      };
      tick();
    }
  }

  function fxCardSlideIn(payload) {
    const fromR = rectOrNull(payload.from);
    const toR = rectOrNull(payload.to);
    if (!fromR || !toR) return;

    const el = acquire(cardPoolRef.current);
    if (!el) return;

    el.style.display = 'block';
    el.style.opacity = '1';
    Object.assign(el.style, cardStyle(payload.tier || 1));
    el.textContent = '';

    const a = centerFrom(fromR);
    const b = centerFrom(toR);

    const startX = a.x - 27;
    const startY = a.y - 37;
    const endX = b.x - 27;
    const endY = b.y - 37;

    if (reduced) {
      el.style.transform = `translate(${endX}px, ${endY}px) scale(1)`;
      const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      el._fxAnim = anim;
      anim.onfinish = () => release(el);
      window.setTimeout(() => release(el), 240);
      return;
    }

    const keyframes = [
      { transform: `translate(${startX}px, ${startY}px) scale(0.94)`, opacity: 0.0 },
      { transform: `translate(${endX}px, ${endY}px) scale(1.05)`, opacity: 1.0, offset: 0.78 },
      { transform: `translate(${endX}px, ${endY}px) scale(1.0)`, opacity: 1.0 },
    ];
    const anim = el.animate(keyframes, { duration: DUR.slide, easing: 'cubic-bezier(0.2, 1.1, 0.3, 1)', fill: 'forwards' });
    el._fxAnim = anim;

    anim.onfinish = () => {
      if (payload.flipAfter) {
        fxCardFlip({ at: toR, tier: payload.tier || 1 });
      }
      release(el);
    };

    window.setTimeout(() => release(el), DUR.slide + 140);
  }

  // ✅ Card Flip: card-pack back + shine sweep (no text)
  function fxCardFlip(payload) {
    const atR = rectOrNull(payload.at);
    if (!atR) return;

    const el = acquire(cardPoolRef.current);
    if (!el) return;

    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.perspective = '900px';
    Object.assign(el.style, cardStyle(payload.tier || 1));

    el.innerHTML = '';
    const inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.borderRadius = '14px';
    inner.style.transformStyle = 'preserve-3d';
    inner.style.willChange = 'transform';
    inner.style.position = 'relative';
    inner.style.overflow = 'hidden';

    // BACK
    const faceBack = document.createElement('div');
    faceBack.style.position = 'absolute';
    faceBack.style.inset = '0';
    faceBack.style.borderRadius = '14px';
    faceBack.style.backfaceVisibility = 'hidden';
    faceBack.style.overflow = 'hidden';
    faceBack.style.background = 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(0,0,0,0.90))';

    const backPattern = document.createElement('div');
    backPattern.style.position = 'absolute';
    backPattern.style.inset = '-40%';
    backPattern.style.background = `repeating-linear-gradient(
      45deg,
      rgba(255,255,255,0.12) 0px,
      rgba(255,255,255,0.12) 8px,
      rgba(255,255,255,0.00) 8px,
      rgba(255,255,255,0.00) 18px
    )`;
    backPattern.style.transform = 'rotate(8deg)';
    backPattern.style.opacity = '0.55';

    const backVignette = document.createElement('div');
    backVignette.style.position = 'absolute';
    backVignette.style.inset = '0';
    backVignette.style.background = 'radial-gradient(circle at 40% 20%, rgba(255,255,255,0.10), rgba(0,0,0,0.55) 70%)';

    const emblem = document.createElement('div');
    emblem.style.position = 'absolute';
    emblem.style.left = '50%';
    emblem.style.top = '50%';
    emblem.style.width = '18px';
    emblem.style.height = '18px';
    emblem.style.borderRadius = '999px';
    emblem.style.transform = 'translate(-50%, -50%)';
    emblem.style.background = 'rgba(255,255,255,0.18)';
    emblem.style.border = '1px solid rgba(255,255,255,0.22)';
    emblem.style.boxShadow = '0 8px 18px rgba(0,0,0,0.35)';

    faceBack.appendChild(backPattern);
    faceBack.appendChild(backVignette);
    faceBack.appendChild(emblem);

    // FRONT
    const faceFront = document.createElement('div');
    faceFront.style.position = 'absolute';
    faceFront.style.inset = '0';
    faceFront.style.borderRadius = '14px';
    faceFront.style.backfaceVisibility = 'hidden';
    faceFront.style.transform = 'rotateY(180deg)';
    faceFront.style.overflow = 'hidden';

    const tier = payload.tier || 1;
    const frontBg =
      tier === 3
        ? 'linear-gradient(135deg, rgba(255,235,235,0.98), rgba(255,255,255,0.94))'
        : tier === 2
          ? 'linear-gradient(135deg, rgba(230,242,255,0.98), rgba(255,255,255,0.94))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(238,238,238,0.94))';

    faceFront.style.background = frontBg;

    const gloss = document.createElement('div');
    gloss.style.position = 'absolute';
    gloss.style.inset = '0';
    gloss.style.background = 'radial-gradient(circle at 30% 18%, rgba(255,255,255,0.65), rgba(255,255,255,0.00) 55%)';
    gloss.style.opacity = '0.85';

    const shine = document.createElement('div');
    shine.style.position = 'absolute';
    shine.style.top = '-30%';
    shine.style.left = '-60%';
    shine.style.width = '70%';
    shine.style.height = '160%';
    shine.style.transform = 'skewX(-18deg)';
    shine.style.background = 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.65), rgba(255,255,255,0))';
    shine.style.opacity = '0';

    const rim = document.createElement('div');
    rim.style.position = 'absolute';
    rim.style.inset = '0';
    rim.style.borderRadius = '14px';
    rim.style.border = '1px solid rgba(255,255,255,0.55)';
    rim.style.boxShadow = '0 0 0 rgba(255,255,255,0)';

    faceFront.appendChild(gloss);
    faceFront.appendChild(shine);
    faceFront.appendChild(rim);

    inner.appendChild(faceBack);
    inner.appendChild(faceFront);
    el.appendChild(inner);

    const c = centerFrom(atR);
    el.style.transform = `translate(${c.x - 27}px, ${c.y - 37}px) scale(1.02)`;

    if (reduced) {
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
      el._fxAnim = fade;
      fade.onfinish = () => release(el);
      window.setTimeout(() => release(el), 320);
      return;
    }

    const flipAnim = inner.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }],
      { duration: DUR.flip, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)', fill: 'forwards' }
    );
    el._fxAnim = flipAnim;

    window.setTimeout(() => {
      try {
        shine.style.opacity = '0.95';
        const a = shine.animate(
          [
            { transform: 'translateX(0px) skewX(-18deg)', opacity: 0.0 },
            { transform: 'translateX(140px) skewX(-18deg)', opacity: 0.95, offset: 0.45 },
            { transform: 'translateX(260px) skewX(-18deg)', opacity: 0.0 },
          ],
          { duration: 320, easing: 'ease-out', fill: 'forwards' }
        );
        rim.style.boxShadow = '0 0 20px rgba(255,255,255,0.22)';
        a.onfinish = () => {
          shine.style.opacity = '0';
          rim.style.boxShadow = '0 0 0 rgba(255,255,255,0)';
        };
      } catch {}
    }, Math.floor(DUR.flip * 0.52));

    flipAnim.onfinish = () => {
      fxParticleBurst(c.x, c.y, { color: 'rgba(255,255,255,0.95)', count: 8, speed: 170 });
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      el._fxAnim = fade;
      fade.onfinish = () => release(el);
      window.setTimeout(() => release(el), DUR.flip + 180);
    };

    window.setTimeout(() => release(el), DUR.flip + 260);
  }

  function fxPickHighlight(payload) {
    const atR = rectOrNull(payload.at);
    if (!atR) return;
    if (reduced) return;

    const el = acquire(textPoolRef.current);
    if (!el) return;

    const c = centerFrom(atR);

    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.padding = '0px';
    el.style.borderRadius = '16px';
    el.style.width = '64px';
    el.style.height = '84px';
    el.style.background = 'transparent';
    el.style.border = '2px solid rgba(251,191,36,0.75)';
    el.style.boxShadow = '0 0 0 0 rgba(251,191,36,0.0)';
    el.textContent = '';

    el.style.transform = `translate(${c.x - 32}px, ${c.y - 42}px) scale(1)`;

    const anim = el.animate(
      [
        { transform: `translate(${c.x - 32}px, ${c.y - 42}px) scale(0.98)`, opacity: 0.0, boxShadow: '0 0 0 0 rgba(251,191,36,0.0)' },
        { transform: `translate(${c.x - 32}px, ${c.y - 42}px) scale(1.03)`, opacity: 1.0, boxShadow: '0 0 22px rgba(251,191,36,0.28)', offset: 0.55 },
        { transform: `translate(${c.x - 32}px, ${c.y - 42}px) scale(1.0)`, opacity: 0.0, boxShadow: '0 0 0 0 rgba(251,191,36,0.0)' },
      ],
      { duration: DUR.highlight, easing: 'ease-out', fill: 'forwards' }
    );
    el._fxAnim = anim;
    anim.onfinish = () => release(el);
    window.setTimeout(() => release(el), DUR.highlight + 200);
  }

  function fxNobleCeremony(payload) {
    setOverlayMode('ceremony');
    clearTimeoutSafe(overlayTimeoutRef);
    overlayTimeoutRef.current = window.setTimeout(() => setOverlayMode('none'), DUR.ceremony);

    const atR = rectOrNull(payload.at);
    const c = atR ? centerFrom(atR) : { x: window.innerWidth * 0.5, y: window.innerHeight * 0.28 };
    fxParticleBurst(c.x, c.y, { color: COLOR_MAP.gold, count: 12, speed: 220, life: 420 });

    fxToast({
      text: payload.text || '추궁',
      tone: 'gold',
      at: { cx: window.innerWidth * 0.5, cy: window.innerHeight * 0.22 },
      big: true,
    });
  }

  function fxVictory(payload) {
    setOverlayMode('victory');
    clearTimeoutSafe(overlayTimeoutRef);
    overlayTimeoutRef.current = window.setTimeout(() => setOverlayMode('none'), DUR.victory);

    const w = window.innerWidth;
    const h = window.innerHeight;

    fxParticleBurst(w * 0.35, h * 0.35, { color: COLOR_MAP.gold, count: 16, speed: 260, life: 520 });
    fxParticleBurst(w * 0.65, h * 0.35, { color: 'rgba(255,255,255,0.95)', count: 12, speed: 220, life: 480 });

    fxToast({
      text: payload.winnerName ? `승리 · ${payload.winnerName}` : '승리',
      tone: 'gold',
      at: { cx: w * 0.5, cy: h * 0.22 },
      big: true,
    });
  }

  function fxTurnWave(payload) {
    const w = window.innerWidth;
    const atR = rectOrNull(payload.at);
    const c = atR ? centerFrom(atR) : { x: w * 0.5, y: 72 };

    fxParticleBurst(c.x, c.y, { color: 'rgba(255,255,255,0.75)', count: 6, speed: 140, life: 260 });
    fxParticleBurst(c.x, c.y, { color: COLOR_MAP.gold, count: reduced ? 2 : 4, speed: 110, life: 220 });
    if (!reduced) {
      fxToast({ text: payload.text || '턴 전환', tone: 'white', at: { cx: c.x, cy: c.y } });
    }
  }

  function fxShake(payload) {
    const atR = rectOrNull(payload.at);
    if (!atR) return;

    const el = acquire(cardPoolRef.current);
    if (!el) return;

    el.style.display = 'block';
    el.style.opacity = '1';
    Object.assign(el.style, cardStyle(payload.tier || 1));
    el.style.background = 'linear-gradient(135deg, rgba(254,202,202,0.96), rgba(255,255,255,0.94))';
    el.style.border = '1px solid rgba(239,68,68,0.35)';
    el.textContent = '';

    const c = centerFrom(atR);
    const baseX = c.x - 27;
    const baseY = c.y - 37;

    el.style.transform = `translate(${baseX}px, ${baseY}px)`;

    const amp = 8;
    const anim = el.animate(
      [
        { transform: `translate(${baseX}px, ${baseY}px)` },
        { transform: `translate(${baseX - amp}px, ${baseY}px)` },
        { transform: `translate(${baseX + amp}px, ${baseY}px)` },
        { transform: `translate(${baseX - amp * 0.7}px, ${baseY}px)` },
        { transform: `translate(${baseX + amp * 0.7}px, ${baseY}px)` },
        { transform: `translate(${baseX}px, ${baseY}px)` },
      ],
      { duration: DUR.shake, easing: 'ease-in-out', fill: 'forwards' }
    );
    el._fxAnim = anim;

    anim.onfinish = () => {
      fxToast({ text: payload.text || '자원 부족', tone: 'red', at: { cx: c.x, cy: c.y - 54 } });
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      el._fxAnim = fade;
      fade.onfinish = () => release(el);
      window.setTimeout(() => release(el), DUR.shake + 140);
    };
  }

  function fxScorePop(payload) {
    const atR = rectOrNull(payload.at);
    if (!atR) return;

    const c = centerFrom(atR);
    const text = payload.text || '+';
    const tone = payload.tone || 'white';

    const el = acquire(textPoolRef.current);
    if (!el) return;

    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.padding = '6px 10px';
    el.style.borderRadius = '999px';
    el.style.fontWeight = payload.big ? '900' : '800';
    el.style.fontSize = payload.big ? '18px' : '13px';
    el.style.letterSpacing = '0.2px';
    el.style.textAlign = 'center';
    el.textContent = String(text);

    el.style.color =
      tone === 'gold' ? '#111827' :
      tone === 'red' ? 'rgba(255,255,255,0.96)' :
      'rgba(255,255,255,0.96)';

    el.style.background =
      tone === 'gold'
        ? 'linear-gradient(135deg, rgba(251,191,36,0.98), rgba(245,158,11,0.94))'
        : tone === 'red'
          ? 'linear-gradient(135deg, rgba(239,68,68,0.94), rgba(248,113,113,0.90))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.10))';

    el.style.boxShadow = '0 10px 22px rgba(0,0,0,0.25)';
    el.style.border = '1px solid rgba(255,255,255,0.18)';

    const startY = c.y - 12;
    const endY = c.y - 44;

    el.style.transform = `translate(${c.x - 20}px, ${startY}px) scale(0.92)`;

    const anim = el.animate(
      [
        { transform: `translate(${c.x - 20}px, ${startY}px) scale(0.92)`, opacity: 0 },
        { transform: `translate(${c.x - 20}px, ${startY - 10}px) scale(1.10)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${c.x - 20}px, ${endY}px) scale(1.0)`, opacity: 1, offset: 0.78 },
        { transform: `translate(${c.x - 20}px, ${endY - 6}px) scale(0.98)`, opacity: 0 },
      ],
      { duration: DUR.pop, easing: 'cubic-bezier(0.2, 1.0, 0.2, 1)', fill: 'forwards' }
    );
    el._fxAnim = anim;
    anim.onfinish = () => release(el);
    window.setTimeout(() => release(el), DUR.pop + 120);
  }

  function fxToast({ text, tone, at, big }) {
    fxScorePop({ at, text, tone: tone || 'white', big });
  }

  function fxParticleBurst(x, y, opts) {
    if (!canvasRef.current) return;
    particlesRef.current.push(...createParticleBurst(x, y, opts));
    startRafIfNeeded();
  }

  function startRafIfNeeded() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(tickCanvas);
  }

  function tickCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = 0; return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = 0; return; }

    const parts = particlesRef.current;
    const t = nowMs();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const age = t - p.born;
      if (age >= p.life) continue;

      const dt = 1 / 60;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const k = 1 - age / p.life;
      const alpha = k * 0.85;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      alive++;
      parts[alive - 1] = p;
    }
    parts.length = alive;
    ctx.globalAlpha = 1;

    if (alive > 0) rafRef.current = requestAnimationFrame(tickCanvas);
    else rafRef.current = 0;
  }

  function clearTimeoutSafe(ref) {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = 0;
    }
  }

  const overlayPointerEvents = 'none';
  const overlayBg =
    overlayMode === 'victory'
      ? 'radial-gradient(circle at 50% 20%, rgba(251,191,36,0.28), rgba(255,255,255,0.06) 22%, rgba(0,0,0,0.58) 62%)'
      : overlayMode === 'ceremony'
        ? 'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.2), rgba(251,191,36,0.08) 24%, rgba(0,0,0,0.54) 60%)'
        : 'transparent';

  return (
    <>
      <div
        ref={rootRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: Z,
          pointerEvents: overlayPointerEvents,
          background: overlayBg,
          backdropFilter: 'none',
          transform: 'translateZ(0)',
          contain: 'layout style paint',
        }}
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>

      <style jsx global>{`
        .fx-token, .fx-card, .fx-text {
          contain: layout style paint;
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
    </>
  );
}
