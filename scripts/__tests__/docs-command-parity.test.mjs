import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { findMissingCommands } from '../docs-command-parity.mjs';

function withTempRepo(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-parity-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ scripts: { build: 'echo build', test: 'echo test' } }));
    fs.mkdirSync(path.join(tmp, 'backend'));
    fs.writeFileSync(path.join(tmp, 'backend/package.json'), JSON.stringify({ scripts: { test: 'echo test' } }));
    fs.mkdirSync(path.join(tmp, 'frontend'));
    fs.writeFileSync(path.join(tmp, 'frontend/package.json'), JSON.stringify({ scripts: { dev: 'echo dev' } }));
    fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('detects scope-specific missing commands from fixture docs', () => {
  withTempRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'README.md'), 'cd backend && npm run test:unit\ncd frontend && npm run dev\nnpm run build\n');
    const missing = findMissingCommands({
      docs: ['README.md'],
      rootScripts: new Set(['build']),
      backendScripts: new Set(['test']),
      frontendScripts: new Set(['dev']),
      baseDir: tmp,
    });

    assert.equal(missing.length, 1);
    assert.equal(missing[0].scriptName, 'test:unit');
    assert.equal(missing[0].scope, 'backend');
    assert.equal(missing[0].line, 1);
  });
});

test('uses nearest cd scope when multiple contexts appear on one line', () => {
  withTempRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'README.md'), 'cd backend && npm run test && cd frontend && npm run test\n');
    const missing = findMissingCommands({
      docs: ['README.md'],
      rootScripts: new Set(),
      backendScripts: new Set(['test']),
      frontendScripts: new Set(['dev']),
      baseDir: tmp,
    });

    assert.equal(missing.length, 1);
    assert.equal(missing[0].scriptName, 'test');
    assert.equal(missing[0].scope, 'frontend');
  });
});

test('parses npm test as test script reference', () => {
  withTempRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'README.md'), 'cd backend && npm test\ncd frontend && npm test\n');
    const missing = findMissingCommands({
      docs: ['README.md'],
      rootScripts: new Set(),
      backendScripts: new Set(['test']),
      frontendScripts: new Set(['dev']),
      baseDir: tmp,
    });

    assert.equal(missing.length, 1);
    assert.equal(missing[0].scriptName, 'test');
    assert.equal(missing[0].scope, 'frontend');
  });
});
