export type HighlightedSegment = { text: string; highlight: boolean };

/** `[[words]]` marks an emphasised run; unmatched brackets stay literal text. */
const MARKER_RE = /\[\[([\s\S]+?)\]\]/g;

/** Split editor text into plain and highlighted runs (empty runs dropped). */
export function parseHighlightedText(text: string): HighlightedSegment[] {
  const segments: HighlightedSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER_RE)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start), highlight: false });
    segments.push({ text: match[1]!, highlight: true });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), highlight: false });
  return segments;
}

/** Plain text without markers, for alt text, titles and meta. */
export function stripHighlightMarkers(text: string): string {
  return text.replace(MARKER_RE, '$1');
}
