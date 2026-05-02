/** Matches typical `routeAction$` return shapes (success / fail). */
export function looksLikeRouteActionResult(x: unknown): boolean {
  return x != null && typeof x === 'object' && ('success' in (x as object) || 'failed' in (x as object));
}

/**
 * Submit a route action with a **plain JSON-serializable object** (not `FormData`).
 *
 * Qwik City resolves `await action.submit(...)` from `q-data.json` as
 * `result = clientData.loaders[action.id]`. With `FormData`, that loader slot can be
 * missing in practice so `result` stays `undefined` while HTTP still succeeds — see
 * `@builder.io/qwik-city` `loadClientData` + `routeActionQrl` in `index.qwik.mjs`.
 *
 * Must NOT wrap the submit call in a nested `$(async (action) => …)`; pass the
 * `useXAction()` store from the component closure into this plain helper instead.
 */
export async function submitRouteActionFormData(
  action: { submit: (input: unknown) => Promise<unknown>; readonly value?: unknown },
  fields: Record<string, unknown>,
  looksLikePayload: (x: unknown) => boolean,
): Promise<unknown> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) {
      continue;
    }
    if (Array.isArray(v)) {
      payload[k] = v.map((item) => (typeof item === 'string' ? item : String(item)));
    } else {
      payload[k] = v;
    }
  }

  const submitted = await action.submit(payload);
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
