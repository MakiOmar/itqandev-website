import { createContextId, type Signal } from '@builder.io/qwik';

export type LocaleTransitionState = {
  active: Signal<boolean>;
  target: Signal<string | null>;
  startPath: Signal<string | null>;
};

export const LocaleTransitionContext = createContextId<LocaleTransitionState>('locale-transition');

export function beginLocaleTransition(
  state: LocaleTransitionState,
  targetLang: string,
  startPathname: string,
): void {
  state.target.value = targetLang;
  state.startPath.value = startPathname;
  state.active.value = true;
}

export function endLocaleTransition(state: LocaleTransitionState): void {
  state.active.value = false;
  state.target.value = null;
  state.startPath.value = null;
}
