import { component$ } from '@builder.io/qwik';

const PRESETS: Record<string, string> = {
  wave: 'M0,64 C240,96 480,32 720,64 C960,96 1200,32 1440,64 L1440,128 L0,128 Z',
  tilt: 'M0,96 L1440,32 L1440,128 L0,128 Z',
  curve: 'M0,80 Q720,0 1440,80 L1440,128 L0,128 Z',
  triangle: 'M0,128 L720,16 L1440,128 Z',
  mountains: 'M0,128 L240,48 L480,96 L720,24 L960,88 L1200,40 L1440,128 Z',
};

export type ShapeDividerEdge = {
  preset?: string;
  color?: string;
  flip?: boolean;
  height?: number;
};

export const ShapeDividerLayer = component$<{
  edge: 'top' | 'bottom';
  divider?: ShapeDividerEdge | null;
}>(({ edge, divider }) => {
  const preset = String(divider?.preset || 'none');
  const d = PRESETS[preset];
  if (!d) return null;
  const height = Math.max(16, Math.min(240, Number(divider?.height) || 80));
  const color = String(divider?.color || 'var(--kit-color-primary, #0389a1)');
  const flip = divider?.flip === true;
  return (
    <div
      class={[
        'pointer-events-none absolute start-0 end-0 z-[2] overflow-hidden leading-[0]',
        edge === 'top' ? 'top-0' : 'bottom-0',
      ].join(' ')}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 128"
        preserveAspectRatio="none"
        class="h-full w-full"
        style={{
          transform: [
            edge === 'top' ? 'rotate(180deg)' : '',
            flip ? 'scaleX(-1)' : '',
          ]
            .filter(Boolean)
            .join(' '),
        }}
      >
        <path fill={color} d={d} />
      </svg>
    </div>
  );
});
