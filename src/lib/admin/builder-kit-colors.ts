import { createContextId } from '@builder.io/qwik';
import type { KitColorToken } from '~/lib/marketing/design-kit';

/** Design-kit colours offered as "Global colours" by pickers with `allowGlobal`. */
export const BuilderKitColorsContext = createContextId<{ colors: KitColorToken[] }>('builder.kit-colors');
