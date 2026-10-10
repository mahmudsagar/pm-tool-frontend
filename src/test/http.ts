import { vi } from 'vitest';

/** Builds a fetch Response with a JSON body. */
export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const success = <T>(data: T) => ({ status: 'success', message: [{ success: ['ok'] }], data });
export const failure = (message: string | string[]) => ({ status: 'failed', message: [{ error: [message] }] });

/** Replaces global fetch with a mock that answers each call in order. */
export function mockFetch(...responses: Array<Response | Error>) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) fn.mockRejectedValueOnce(r);
    else fn.mockResolvedValueOnce(r);
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}
