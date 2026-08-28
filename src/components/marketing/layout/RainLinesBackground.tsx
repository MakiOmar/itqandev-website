import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

export type RainLinesBackgroundProps = {
  color?: string;
  speed?: number;
  density?: number;
  direction?: 'down' | 'up' | 'both';
};

type Streak = {
  x: number;
  y: number;
  len: number;
  speed: number;
  dir: 1 | -1;
  tipWidth: number;
};

/**
 * Animated rain streaks with a thicker rounded tip (canvas).
 */
export const RainLinesBackground = component$<RainLinesBackgroundProps>((props) => {
  const canvasRef = useSignal<HTMLCanvasElement>();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup, track }) => {
    const speedSetting = track(() => props.speed ?? 45);
    const densitySetting = track(() => props.density ?? 50);
    const colorSetting = track(() => props.color ?? '');
    const directionSetting = track(() => props.direction ?? 'down');

    const canvas = canvasRef.value;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let streaks: Streak[] = [];
    let viewW = 0;
    let viewH = 0;

    const isDark = () => document.documentElement.classList.contains('dark');
    const baseSpeed = 0.6 + (speedSetting / 100) * 2.4;
    const countFactor = 0.4 + densitySetting / 100;

    const strokeColor = () => {
      if (colorSetting && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorSetting)) {
        return colorSetting;
      }
      return isDark() ? 'rgba(148, 163, 184, 0.55)' : 'rgba(100, 116, 139, 0.45)';
    };

    const initStreaks = (w: number, h: number) => {
      const count = Math.max(12, Math.min(90, Math.floor((w * h) / 9000) * countFactor));
      streaks = [];
      for (let i = 0; i < count; i++) {
        const dir: 1 | -1 =
          directionSetting === 'both'
            ? Math.random() > 0.5
              ? 1
              : -1
            : directionSetting === 'up'
              ? -1
              : 1;
        streaks.push({
          x: Math.random() * w,
          y: Math.random() * h,
          len: 18 + Math.random() * 42,
          speed: baseSpeed * (0.6 + Math.random() * 0.8),
          dir,
          tipWidth: 1.2 + Math.random() * 2.2,
        });
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect?.width ?? window.innerWidth));
      const h = Math.max(1, Math.floor(rect?.height ?? 240));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = w;
      viewH = h;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStreaks(w, h);
    };

    const drawStreak = (s: Streak) => {
      const tipY = s.y + s.len * s.dir;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x, tipY);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.65, strokeColor());
      grad.addColorStop(1, strokeColor());

      ctx.strokeStyle = grad;
      ctx.lineCap = 'round';
      ctx.lineWidth = s.tipWidth;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, tipY);
      ctx.stroke();

      ctx.fillStyle = strokeColor();
      ctx.beginPath();
      ctx.arc(s.x, tipY, s.tipWidth * 0.55, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = () => {
      if (reducedMotion) {
        ctx.clearRect(0, 0, viewW, viewH);
        for (const s of streaks) drawStreak(s);
        return;
      }
      ctx.clearRect(0, 0, viewW, viewH);
      for (const s of streaks) {
        s.y += s.speed * s.dir;
        if (s.dir === 1 && s.y - s.len > viewH) {
          s.y = -s.len;
          s.x = Math.random() * viewW;
        } else if (s.dir === -1 && s.y + s.len < 0) {
          s.y = viewH + s.len;
          s.x = Math.random() * viewW;
        }
        drawStreak(s);
      }
      rafId = requestAnimationFrame(tick);
    };

    resize();
    tick();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (canvas.parentElement && ro) ro.observe(canvas.parentElement);
    window.addEventListener('resize', resize);

    cleanup(() => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    });
  });

  return (
    <canvas
      ref={canvasRef}
      class="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
});
