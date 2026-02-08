/**
 * Shared utilities for regression E2E tests.
 *
 * These tests hit a **running** backend at localhost:3000 using native fetch.
 * They are read-only and safe to run against a seeded dev stack.
 */

export const API_BASE_URL =
  process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';

/**
 * Wrapper around fetch that adds the API base URL and better error context.
 */
export async function fetchApi(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(
      `fetchApi ${options?.method ?? 'GET'} ${url} failed: ${error instanceof Error ? error.message : error}`,
    );
  }
}

/**
 * Fetches a CSRF token and its cookie from the server.
 * Returns { token, cookie } so callers can include both in mutation requests.
 */
export async function getCsrfToken(): Promise<{
  token: string;
  cookie: string;
}> {
  const res = await fetchApi('/csrf-token');
  const setCookie = res.headers.get('set-cookie') ?? '';
  const body = (await res.json()) as { csrfToken: string };
  return { token: body.csrfToken, cookie: setCookie };
}

/**
 * Asserts the response has a JSON content-type header and returns the parsed body.
 */
export async function assertJsonResponse<T = unknown>(
  response: Response,
): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(
      `Expected JSON content-type but got "${contentType}". Body: ${text.slice(0, 500)}`,
    );
  }
  return (await response.json()) as T;
}

/**
 * Validates that a value is a proper ISO 8601 date string.
 * Catches the common Date serialization bug where dates become `{}`.
 */
export function assertDateField(value: unknown, fieldName: string): void {
  if (value === null || value === undefined) return; // nullable dates are ok

  if (typeof value !== 'string') {
    throw new Error(
      `${fieldName}: expected ISO date string, got ${typeof value} (${JSON.stringify(value)})`,
    );
  }

  // ISO 8601 dates contain 'T' separator (e.g. 2024-01-15T10:30:00.000Z)
  if (!value.includes('T')) {
    throw new Error(
      `${fieldName}: expected ISO date string with 'T' separator, got "${value}"`,
    );
  }

  // Verify it parses to a valid date
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    throw new Error(
      `${fieldName}: "${value}" is not a valid date`,
    );
  }
}

/**
 * Validates that a BigInt field was serialized as a string (not a number, not an error).
 */
export function assertBigIntField(value: unknown, fieldName: string): void {
  if (value === null || value === undefined) return; // nullable BigInts are ok

  if (typeof value !== 'string') {
    throw new Error(
      `${fieldName}: expected BigInt as string, got ${typeof value} (${JSON.stringify(value)})`,
    );
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      `${fieldName}: expected numeric string for BigInt, got "${value}"`,
    );
  }
}

/**
 * Asserts that no string field in the object contains "[object Object]",
 * which indicates a serialization bug.
 */
export function assertNoObjectStrings(
  obj: unknown,
  path = 'root',
): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'string') {
    if (obj.includes('[object Object]')) {
      throw new Error(
        `${path}: contains "[object Object]" — likely a serialization bug`,
      );
    }
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => assertNoObjectStrings(item, `${path}[${i}]`));
    return;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      assertNoObjectStrings(value, `${path}.${key}`);
    }
  }
}
