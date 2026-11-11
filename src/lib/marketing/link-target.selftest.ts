/**
 * Node check for widget link targets (run: npx --yes tsx src/lib/marketing/link-target.selftest.ts).
 */
import { linkTargetAttrs } from './link-target';

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

assert(same(linkTargetAttrs('/about', false), {}), 'current window has no target or rel');
assert(
  same(linkTargetAttrs('https://play.google.com', true), { target: '_blank', rel: 'noopener noreferrer' }),
  'new window adds _blank and noopener noreferrer',
);
assert(same(linkTargetAttrs('https://x.test', 'true', 'nofollow'), { target: '_blank', rel: 'nofollow noopener noreferrer' }), 'extra rel tokens kept');
assert(same(linkTargetAttrs('#pricing', true), {}), 'same-page anchor never opens a new window');
assert(same(linkTargetAttrs(' #pricing', true, 'nofollow'), { rel: 'nofollow' }), 'anchor keeps its own rel');
assert(same(linkTargetAttrs('/x', false, 'bad"token nofollow'), { rel: 'nofollow' }), 'invalid rel tokens dropped');

console.log('link-target selftest: ok');
