/** Matches typical `routeAction$` return shapes (success / fail). */
export function looksLikeRouteActionResult(x: unknown): boolean {
  return x != null && typeof x === 'object' && ('success' in (x as object) || 'failed' in (x as object));
}

/**
 * Build FormData from flat fields and call `action.submit(fd)`.
 *
 * Must NOT be wrapped in `$()` nor take `action` through a nested QRL parameter:
 * Qwik can deserialize a different object there, so `.value` on that copy stays undefined
 * even when the server action succeeds (see admin service save debugging).
 */
export async function submitRouteActionFormData(
  action: { submit: (fd: FormData) => Promise<unknown>; readonly value?: unknown },
  fields: Record<string, unknown>,
  looksLikePayload: (x: unknown) => boolean,
): Promise<unknown> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) {
      continue;
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        fd.append(`${k}[]`, String(item));
      }
    } else {
      fd.append(k, String(v));
    }
  }

  const submitted = await action.submit(fd);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  let storeVal: unknown = action.value;
  if (storeVal === undefined || storeVal === null) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    storeVal = action.value;
  }

  const fromEnvelope =
    submitted != null && typeof submitted === 'object' && 'value' in submitted
      ? (submitted as { value: unknown }).value
      : undefined;

  let out: unknown =
    fromEnvelope !== undefined && fromEnvelope !== null
      ? fromEnvelope
      : storeVal !== undefined && storeVal !== null
        ? storeVal
        : looksLikePayload(submitted)
          ? submitted
          : undefined;

  if (
    out != null &&
    typeof out === 'object' &&
    'status' in out &&
    'value' in out &&
    (out as { value: unknown }).value === undefined
  ) {
    out = storeVal !== undefined && storeVal !== null ? storeVal : undefined;
  }

  return out;
}
