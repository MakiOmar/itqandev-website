import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import {
  densityToDivisor,
  hexToRgb,
  opacityToAlphaScale,
  sizeToRadiusScale,
  speedToVelocity,
  type HeroParticlesConfig,
} from '~/lib/marketing/hero-particles';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
};

export type ParticlesBackgroundProps = Partial<HeroParticlesConfig> & {
  /** `contained` fills the hero section; `fixed` covers the viewport (legacy). */
  layout?: 'contained' | 'fixed';
};

/**
 * Canvas particle network. Contained layout is absolute within the hero;
 * theme-aware colors unless `color` hex is set. Respects prefers-reduced-motion.
 */
export const ParticlesBackground = component$<ParticlesBackgroundProps>((props) => {
  const canvasRef = useSignal<HTMLCanvasElement>();

  // eslint-disable-next-line qwik/no-use-visible-task -- canvas animation must run in the browser
  useVisibleTask$(({ cleanup, track }) => {
    const density = track(() => props.density ?? 50);
    const speed = track(() => props.speed ?? 40);
    const opacity = track(() => props.opacity ?? 55);
    const size = track(() => props.size ?? 40);
    const color = track(() => props.color ?? '');
    const layout = track(() => props.layout ?? 'contained');

    const canvas = canvasRef.value;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let particles: Particle[] = [];
    let viewW = 0;
    let viewH = 0;

    const isDark = () => document.documentElement.classList.contains('dark');
    const velocity = speedToVelocity(speed);
    const divisor = densityToDivisor(density);
    const radiusScale = sizeToRadiusScale(size);
    const alphaScale = opacityToAlphaScale(opacity);
    const customRgb = hexToRgb(color);

    const initParticles = (w: number, h: number) => {
      const count = Math.max(16, Math.min(120, Math.floor((w * h) / divisor)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * velocity * 2,
          vy: (Math.random() - 0.5) * velocity * 2,
          r: (Math.random() * 1.4 + 0.5) * radiusScale,
          alpha: (Math.random() * 0.35 + 0.2) * alphaScale,
        });
      }
    };

    const measure = (): { w: number; h: number } => {
      if (layout === 'fixed') {
        return { w: window.innerWidth, h: window.innerHeight };
      }
      const parent = canvas.parentElement;
      if (!parent) {
        return { w: window.innerWidth, h: Math.max(320, window.innerHeight * 0.6) };
      }
      const rect = parent.getBoundingClientRect();
      return {
        w: Math.max(1, Math.floor(rect.width)),
        h: Math.max(1, Math.floor(rect.height)),
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { w, h } = measure();
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
      if (resizeRaf) return;
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
      const lineRgb = customRgb
        ? `${customRgb.r}, ${customRgb.g}, ${customRgb.b}`
        : dark
          ? '148, 163, 184'
          : '71, 85, 105';
      const nodeRgb = customRgb
        ? `${customRgb.r}, ${customRgb.g}, ${customRgb.b}`
        : dark
          ? '56, 189, 248'
          : '3, 105, 161';

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
            const a = (1 - d / linkDistance) * (dark ? 0.14 : 0.26) * alphaScale;
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

    let ro: ResizeObserver | undefined;
    if (layout === 'contained' && typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      ro = new ResizeObserver(() => scheduleResize());
      ro.observe(canvas.parentElement);
    }

    tick();

    cleanup(() => {
      cancelAnimationFrame(rafId);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', scheduleResize);
      ro?.disconnect();
    });
  });

  const layoutClass =
    props.layout === 'fixed'
      ? 'pointer-events-none fixed inset-0 z-0 h-full w-full'
      : 'pointer-events-none absolute inset-0 z-0 h-full w-full';

  return <canvas ref={canvasRef} class={layoutClass} aria-hidden="true" />;
});
