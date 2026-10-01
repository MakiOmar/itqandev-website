import { component$ } from '@builder.io/qwik';
import { renderLayoutBlock } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import {
  CHROME_DATA_KIT_TYPES,
  CHROME_EXCLUDED_BLOCK_TYPES,
} from '~/lib/marketing/chrome-blocks';
import {
  EMPTY_CHROME_BLOCK_SUPPORT,
  chromePageRendererProps,
  type ChromePageBlockProps,
} from './chrome-page-block-props';
import { ChromeDataKitBlock } from './ChromeDataKitBlock';

/**
 * A page-builder widget or kit inside a header/footer layout, rendered by the page renderer.
 * Own component so the page renderer stays out of the chrome kit chunk.
 */
export const ChromePageBlock = component$<ChromePageBlockProps>((props) => {
  const type = props.block.type;
  if (CHROME_EXCLUDED_BLOCK_TYPES.has(type)) {
    return null;
  }
  if (CHROME_DATA_KIT_TYPES.has(type)) {
    return (
      <ChromeDataKitBlock
        block={props.block}
        uiLocale={props.uiLocale}
        branding={props.branding}
        features={props.features}
        contact={props.contact}
      />
    );
  }
  return <>{renderLayoutBlock(props.block, chromePageRendererProps(props, EMPTY_CHROME_BLOCK_SUPPORT))}</>;
});
