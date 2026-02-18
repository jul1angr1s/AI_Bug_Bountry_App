#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOC_FILES = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/TESTING.md',
  'docs/ARCHITECTURE.md',
  'docs/deployment/railway.md',
  'docs/DEPLOYMENT.md',
  'docs/PRODUCTION.md',
];

const SCRIPT_REGEX = /npm\s+run\s+([a-zA-Z0-9:_-]+)/g;
const NPM_TEST_REGEX = /npm\s+test\b/g;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadScripts(packagePath) {
  const filePath = path.resolve(REPO_ROOT, packagePath);
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return new Set(Object.keys(pkg.scripts || {}));
}

function commandScope(line, commandIndex) {
  const prefix = line.slice(0, commandIndex);
  const matches = [...prefix.matchAll(/cd\s+(backend|frontend)\b/g)];
  if (matches.length > 0) return matches[matches.length - 1][1];
  return 'any';
}

export function findMissingCommands({
  docs = DOC_FILES,
  rootScripts,
  backendScripts,
  frontendScripts,
  baseDir = REPO_ROOT,
}) {
  const missing = [];

  for (const relFile of docs) {
    const filePath = path.resolve(baseDir, relFile);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const commands = [];
      let match;

      SCRIPT_REGEX.lastIndex = 0;
      while ((match = SCRIPT_REGEX.exec(line)) !== null) {
        commands.push({ scriptName: match[1], index: match.index });
      }

      NPM_TEST_REGEX.lastIndex = 0;
      while ((match = NPM_TEST_REGEX.exec(line)) !== null) {
        commands.push({ scriptName: 'test', index: match.index });
      }

      for (const command of commands) {
        const scope = commandScope(line, command.index);

        let exists = false;
        if (scope === 'backend') exists = backendScripts.has(command.scriptName);
        else if (scope === 'frontend') exists = frontendScripts.has(command.scriptName);
        else
          exists =
            rootScripts.has(command.scriptName) ||
            backendScripts.has(command.scriptName) ||
            frontendScripts.has(command.scriptName);

        if (!exists) {
          missing.push({
            file: relFile,
            line: i + 1,
            scriptName: command.scriptName,
            scope,
            text: line.trim(),
          });
        }
      }
    });
  }

  return missing;
}

export function runParityCheck(docs = DOC_FILES) {
  const rootScripts = loadScripts('package.json');
  const backendScripts = loadScripts('backend/package.json');
  const frontendScripts = loadScripts('frontend/package.json');

  const missing = findMissingCommands({ docs, rootScripts, backendScripts, frontendScripts, baseDir: REPO_ROOT });

  if (missing.length === 0) {
    console.log('docs-command-parity: OK');
    return 0;
  }

  console.error('docs-command-parity: missing documented scripts');
  for (const item of missing) {
    console.error(`- ${item.file}:${item.line} -> npm run ${item.scriptName} (scope: ${item.scope})`);
  }

  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runParityCheck());
}
