import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
};

/**
 * Fixed viewport canvas: subtle nodes + links, theme-aware (html.dark).
 * Respects prefers-reduced-motion (static frame only).
 */
export const ParticlesBackground = component$(() => {
  const canvasRef = useSignal<HTMLCanvasElement>();

  // eslint-disable-next-line qwik/no-use-visible-task -- canvas animation must run in the browser
  useVisibleTask$(({ cleanup }) => {
    const canvas = canvasRef.value;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let particles: Particle[] = [];

    const isDark = () => document.documentElement.classList.contains('dark');

    const initParticles = (w: number, h: number) => {
      const density = 22000;
      const count = Math.max(28, Math.min(96, Math.floor((w * h) / density)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.4 + 0.5,
          // Base opacity; light theme gets a boost when drawn (pale BG washes out low alpha)
          alpha: Math.random() * 0.35 + 0.2,
        });
      }
    };

    let viewW = 0;
    let viewH = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      viewW = w;
      viewH = h;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(w, h);
    };

    let resizeRaf = 0;
    const scheduleResize = () => {
      if (resizeRaf) {
        return;
      }
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
      });
    };

    const linkDistance = 118;

    const tick = () => {
      const w = viewW;
      const h = viewH;
      if (!w || !h) {
        if (!reducedMotion) {
          rafId = requestAnimationFrame(tick);
        }
        return;
      }
      const dark = isDark();
      // Light: darker slate + stronger alpha so lines read on white/blue-50 gradients
      const lineRgb = dark ? '148, 163, 184' : '71, 85, 105';
      const nodeRgb = dark ? '56, 189, 248' : '3, 105, 161';

      ctx.clearRect(0, 0, w, h);

      if (!reducedMotion) {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x <= 0 || p.x >= w) p.vx *= -1;
          if (p.y <= 0 || p.y >= h) p.vy *= -1;
          p.x = Math.max(0, Math.min(w, p.x));
          p.y = Math.max(0, Math.min(h, p.y));
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDistance) {
            const a = (1 - d / linkDistance) * (dark ? 0.14 : 0.26);
            ctx.strokeStyle = `rgba(${lineRgb}, ${a})`;
            ctx.lineWidth = dark ? 0.55 : 0.65;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const a = dark ? p.alpha : Math.min(1, p.alpha * 1.15);
        ctx.fillStyle = `rgba(${nodeRgb}, ${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion) {
        rafId = requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener('resize', scheduleResize);
    tick();

    cleanup(() => {
      cancelAnimationFrame(rafId);
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
      }
      window.removeEventListener('resize', scheduleResize);
    });
  });

  return (
    <canvas
      ref={canvasRef}
      class="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
});
