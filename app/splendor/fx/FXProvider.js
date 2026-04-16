// app/splendor/fx/FXProvider.js
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * FXProvider
 * - Central event bus for VFX/SFX triggers (cards/gems flying, overlays, shakes, etc.)
 * - Anchor registry for coordinate-based animations (bank, board slots, HUD, etc.)
 *
 * Design goals:
 * - No rerender spam: events stored in refs, consumers subscribe to changes.
 * - SSR-safe: no window access during render.
 * - Mobile-safe: minimal allocations, optional debug capture.
 */

/** @typedef {{ id:string, type:string, ts:number, payload?:any, meta?:any }} FxEvent */

const FXContext = createContext(null);

function nowMs() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

function createFxId(prefix = 'fx') {
  // Unique-enough for UI FX events: time + counter + random
  const t = Math.floor(Date.now()).toString(36);
  const r = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}_${t}_${r}`;
}

export function FXProvider({
  children,
  /**
   * Optional: enable debug log capture for mobile (in-memory ring buffer)
   * - false by default
   */
  debug = false,
  /**
   * Ring buffer size for debug events
   */
  debugLimit = 50,
}) {
  // --- Anchors (key -> HTMLElement)
  const anchorsRef = useRef(new Map());

  // --- Event queue (append-only, drained by consumers)
  const queueRef = useRef(/** @type {FxEvent[]} */ ([]));

  // --- Subscribers (FXLayer or others)
  const subsRef = useRef(new Set());

  // --- Debug ring buffer
  const debugRef = useRef({
    enabled: !!debug,
    limit: Math.max(10, debugLimit | 0),
    items: /** @type {FxEvent[]} */ ([]),
  });

  // --- Reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(!!mq.matches);
    apply();

    // Safari compatibility: addEventListener may not exist on older versions
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    mq.addListener?.(apply);
    return () => mq.removeListener?.(apply);
  }, []);

  const notify = useCallback(() => {
    // Notify subscribers without causing rerenders
    for (const fn of subsRef.current) {
      try {
        fn();
      } catch (e) {
        // Never let FX subscribers break gameplay
        // eslint-disable-next-line no-console
        console.error('[FX] subscriber error', e);
      }
    }
  }, []);

  /** Subscribe to FX changes (queue appended / anchors changed). Returns unsubscribe. */
  const subscribe = useCallback((fn) => {
    subsRef.current.add(fn);
    return () => subsRef.current.delete(fn);
  }, []);

  /** Emit an FX event (append to queue). */
  const emit = useCallback((type, payload = undefined, meta = undefined) => {
    const evt = {
      id: createFxId(type),
      type,
      ts: nowMs(),
      payload,
      meta,
    };
    queueRef.current.push(evt);

    if (debugRef.current.enabled) {
      const d = debugRef.current;
      d.items.push(evt);
      if (d.items.length > d.limit) d.items.splice(0, d.items.length - d.limit);
    }

    notify();
    return evt.id;
  }, [notify]);

  /** Emit many events as a batch (single notify) */
  const emitBatch = useCallback((events) => {
    // events: Array<{type, payload?, meta?}>
    const outIds = [];
    const q = queueRef.current;

    for (const e of events || []) {
      if (!e || !e.type) continue;
      const evt = {
        id: createFxId(e.type),
        type: e.type,
        ts: nowMs(),
        payload: e.payload,
        meta: e.meta,
      };
      q.push(evt);
      outIds.push(evt.id);

      if (debugRef.current.enabled) {
        const d = debugRef.current;
        d.items.push(evt);
      }
    }

    if (debugRef.current.enabled) {
      const d = debugRef.current;
      if (d.items.length > d.limit) d.items.splice(0, d.items.length - d.limit);
    }

    notify();
    return outIds;
  }, [notify]);

  /**
   * Drain queued events.
   * Consumers (FXLayer) should call this on subscription tick.
   */
  const drain = useCallback((maxCount = 9999) => {
    const q = queueRef.current;
    if (!q.length) return [];
    const n = Math.min(maxCount | 0, q.length);
    const out = q.splice(0, n);
    return out;
  }, []);

  /**
   * Register/unregister anchors
   * - key: string id like "bank:red", "board:t2:s3", "hud:ME"
   * - el: HTMLElement
   */
  const registerAnchor = useCallback((key, el) => {
    if (!key) return;
    const map = anchorsRef.current;
    if (el) map.set(key, el);
    else map.delete(key);
    notify();
  }, [notify]);

  /** Convenience: returns a stable ref-callback for React elements */
  const anchorRef = useCallback((key) => {
    return (el) => registerAnchor(key, el);
  }, [registerAnchor]);

  /** Get anchor element (if exists) */
  const getAnchorEl = useCallback((key) => {
    if (!key) return null;
    return anchorsRef.current.get(key) || null;
  }, []);

  /**
   * Get anchor rect in viewport coordinates (DOMRect-like object)
   * Returns null if missing or detached.
   */
  const getAnchorRect = useCallback((key) => {
    const el = getAnchorEl(key);
    if (!el) return null;
    // If element is detached, ignore
    if (!el.isConnected) return null;

    const r = el.getBoundingClientRect();
    // return a plain object (stable for structured clone / serialization if needed)
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      left: r.left,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
    };
  }, [getAnchorEl]);

  /** Debug controls */
  const setDebugEnabled = useCallback((enabled) => {
    debugRef.current.enabled = !!enabled;
  }, []);
  const getDebugEvents = useCallback(() => {
    return debugRef.current.items.slice();
  }, []);

  // Stable API object (functions are stable via useCallback)
  const api = useMemo(() => {
    return {
      // event bus
      emit,
      emitBatch,
      drain,
      subscribe,

      // anchors
      registerAnchor,
      anchorRef,
      getAnchorEl,
      getAnchorRect,

      // environment
      reducedMotion,

      // debug
      setDebugEnabled,
      getDebugEvents,
    };
  }, [
    emit,
    emitBatch,
    drain,
    subscribe,
    registerAnchor,
    anchorRef,
    getAnchorEl,
    getAnchorRect,
    reducedMotion,
    setDebugEnabled,
    getDebugEvents,
  ]);

  return <FXContext.Provider value={api}>{children}</FXContext.Provider>;
}

/** Hook to access FX API */
export function useFX() {
  const ctx = useContext(FXContext);
  if (!ctx) {
    throw new Error('useFX must be used within <FXProvider>.');
  }
  return ctx;
}

/**
 * Optional hook: subscribe to FX ticks (queue/anchors changed)
 * Usage:
 *   const fx = useFX();
 *   useFXSubscribe(() => { const evts = fx.drain(); ... })
 */
export function useFXSubscribe(onTick) {
  const fx = useFX();
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!fx?.subscribe) return;
    const unsub = fx.subscribe(() => onTickRef.current?.());
    return unsub;
  }, [fx]);
}

export { FXContext, createFxId };
