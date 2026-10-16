/** JSON for an inline `<script type="application/ld+json">`; `<` is escaped so data can never close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
