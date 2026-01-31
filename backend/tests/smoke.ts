const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

async function assert(condition: boolean, message: string): Promise<void> {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(path: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function run(): Promise<void> {
  const health = await requestJson('/api/v1/health');
  await assert(health.status === 200, `Expected /health 200, got ${health.status}`);
  await assert(
    typeof (health.body as { status?: string }).status === 'string',
    'Expected /health response to include status'
  );

  const notFound = await requestJson('/api/v1/__smoke__');
  await assert(notFound.status === 404, `Expected 404, got ${notFound.status}`);
  const error = (notFound.body as { error?: { code?: string; message?: string; requestId?: string } }).error;
  await assert(!!error?.code, 'Expected error.code in 404 response');
  await assert(!!error?.message, 'Expected error.message in 404 response');
  await assert(!!error?.requestId, 'Expected error.requestId in 404 response');

  console.log('Smoke tests passed');
}

run().catch((error) => {
  console.error('Smoke tests failed', error);
  process.exit(1);
});
