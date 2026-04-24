'use client';

import { useEffect } from 'react';

type CardState = {
  el: HTMLElement;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  active: boolean;
  rafId: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function setCardVars(card: HTMLElement, x: number, y: number) {
  const rotateX = clamp(-y * 8.5, -12, 12);
  const rotateY = clamp(x * 10.5, -13, 13);
  const shiftX = clamp(x * 16, -20, 20);
  const shiftY = clamp(y * 14, -20, 20);

  card.style.setProperty('--svg-tilt-x', `${rotateX.toFixed(2)}deg`);
  card.style.setProperty('--svg-tilt-y', `${rotateY.toFixed(2)}deg`);
  card.style.setProperty('--svg-shift-x', `${shiftX.toFixed(2)}px`);
  card.style.setProperty('--svg-shift-y', `${shiftY.toFixed(2)}px`);
}

function updateTargetFromPoint(state: CardState, clientX: number, clientY: number) {
  const rect = state.el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const nx = clamp((clientX - rect.left) / rect.width, 0, 1);
  const ny = clamp((clientY - rect.top) / rect.height, 0, 1);
  state.targetX = (nx - 0.5) * 2;
  state.targetY = (ny - 0.5) * 2;
}

function runFrame(state: CardState) {
  state.x += (state.targetX - state.x) * 0.16;
  state.y += (state.targetY - state.y) * 0.16;

  setCardVars(state.el, state.x, state.y);

  const settling =
    Math.abs(state.targetX - state.x) < 0.002 &&
    Math.abs(state.targetY - state.y) < 0.002 &&
    !state.active;

  if (settling) {
    state.el.classList.remove('is-active');
    state.rafId = null;
    return;
  }

  state.el.classList.toggle('is-active', state.active || Math.abs(state.x) > 0.03 || Math.abs(state.y) > 0.03);
  state.rafId = window.requestAnimationFrame(() => runFrame(state));
}

function startFrame(state: CardState) {
  if (state.rafId !== null) {
    return;
  }
  state.rafId = window.requestAnimationFrame(() => runFrame(state));
}

export default function SvgImageReactivity() {
  useEffect(() => {
    const cards = new Set<HTMLElement>(
      Array.from(document.querySelectorAll<HTMLElement>('.prose .svg-depth-card'))
    );

    if (!cards.size) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cleanups: Array<() => void> = [];

    for (const card of cards) {
      setCardVars(card, 0, 0);

      if (prefersReducedMotion) {
        continue;
      }

      const state: CardState = {
        el: card,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        active: false,
        rafId: null,
      };

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === 'touch') {
          return;
        }
        state.active = true;
        updateTargetFromPoint(state, event.clientX, event.clientY);
        startFrame(state);
      };

      const onPointerLeave = () => {
        state.active = false;
        state.targetX = 0;
        state.targetY = 0;
        startFrame(state);
      };

      const onTouchStart = (event: TouchEvent) => {
        if (!event.touches.length) {
          return;
        }
        const touch = event.touches[0];
        state.active = true;
        updateTargetFromPoint(state, touch.clientX, touch.clientY);
        startFrame(state);
      };

      const onTouchMove = (event: TouchEvent) => {
        if (!event.touches.length) {
          return;
        }
        const touch = event.touches[0];
        updateTargetFromPoint(state, touch.clientX, touch.clientY);
        startFrame(state);
      };

      const onTouchEnd = () => {
        state.active = false;
        state.targetX = 0;
        state.targetY = 0;
        startFrame(state);
      };

      card.addEventListener('pointermove', onPointerMove, { passive: true });
      card.addEventListener('pointerleave', onPointerLeave, { passive: true });
      card.addEventListener('touchstart', onTouchStart, { passive: true });
      card.addEventListener('touchmove', onTouchMove, { passive: true });
      card.addEventListener('touchend', onTouchEnd, { passive: true });
      card.addEventListener('touchcancel', onTouchEnd, { passive: true });

      cleanups.push(() => {
        card.removeEventListener('pointermove', onPointerMove);
        card.removeEventListener('pointerleave', onPointerLeave);
        card.removeEventListener('touchstart', onTouchStart);
        card.removeEventListener('touchmove', onTouchMove);
        card.removeEventListener('touchend', onTouchEnd);
        card.removeEventListener('touchcancel', onTouchEnd);
        if (state.rafId !== null) {
          window.cancelAnimationFrame(state.rafId);
        }
      });
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, []);

  return null;
}
