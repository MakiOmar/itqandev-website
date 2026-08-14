/**
 * Public (and builder preview) layout breakpoint from UA / preview device toggle.
 */
import {
  component$,
  createContextId,
  Slot,
  useContext,
  useContextProvider,
  type Signal,
} from '@builder.io/qwik';
import type { LayoutBreakpoint } from './appearance-types';

export const LayoutDeviceContext = createContextId<LayoutBreakpoint>('layout-device');

export const LayoutDeviceProvider = component$<{
  device: LayoutBreakpoint | Signal<LayoutBreakpoint>;
}>((props) => {
  const value =
    typeof props.device === 'object' && props.device !== null && 'value' in props.device
      ? (props.device as Signal<LayoutBreakpoint>).value
      : (props.device as LayoutBreakpoint);
  useContextProvider(LayoutDeviceContext, value);
  return <Slot />;
});

/** Active layout device from nearest LayoutDeviceProvider. */
export function useLayoutDevice(): LayoutBreakpoint {
  return useContext(LayoutDeviceContext);
}
