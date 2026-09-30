import { component$, useStyles$ } from '@builder.io/qwik';
import styles from './hero-watermark.css?inline';

export type HeroWatermarkProps = {
  text: string;
  /** Continuously scroll the text in the page's reading direction. */
  motion: boolean;
  /** Seconds per loop (10–120). */
  durationSeconds: number;
  rtl: boolean;
};

/** Copies per half of the scrolling track; enough to span the hero even for short text. */
const COPIES_PER_HALF = 4;

const TEXT_CLASS =
  'text-[14vw] font-black leading-none tracking-tight text-slate-900/[0.045] dark:text-white/[0.05] sm:text-[12vw] lg:text-[10vw]';

/** Large faded copy behind the hero content (decorative). */
export const HeroWatermark = component$<HeroWatermarkProps>((props) => {
  useStyles$(styles);
  const dir = props.rtl ? 'rtl' : 'ltr';

  if (!props.motion) {
    return (
      <div
        class="pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <span class={`max-w-[95vw] truncate px-4 text-center ${TEXT_CLASS}`} dir={dir}>
          {props.text}
        </span>
      </div>
    );
  }

  return (
    <div
      class="hw-root pointer-events-none absolute inset-0 z-0 flex select-none items-center overflow-hidden"
      data-rtl={props.rtl ? '' : undefined}
      aria-hidden="true"
    >
      <div class="hw-track" dir="ltr" style={{ '--hw-duration': `${props.durationSeconds}s` }}>
        {Array.from({ length: COPIES_PER_HALF * 2 }, (_, i) => (
          <span key={i} class={`hw-copy ${TEXT_CLASS}`} dir={dir}>
            {props.text}
          </span>
        ))}
      </div>
    </div>
  );
});
