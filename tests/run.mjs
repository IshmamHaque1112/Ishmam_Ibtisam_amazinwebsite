// Runs the unit tests with Node's built-in test runner and no extra
// dependencies: TypeScript (already a devDependency) compiles src/**/*.ts and
// tests/*.test.ts into .test-build/, then `node --test` runs the output.
// React components (.tsx) are not compiled; the tests cover the plain logic
// modules that the pages use.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.test-build');

const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

// Relative imports have no extension in the app (Vite resolves them), but
// Node's ESM loader needs one: './x' becomes './x.js' or './x/index.js'.
const addJsExtensions = (code, file) =>
  code.replace(/(from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]+?)\2/g, (match, lead, quote, spec) => {
    if (/\.[cm]?js$/.test(spec)) return match;
    const isDir = existsSync(resolve(dirname(file), spec)) && statSync(resolve(dirname(file), spec)).isDirectory();
    return `${lead}${quote}${spec}${isDir ? '/index.js' : '.js'}${quote}`;
  });

rmSync(out, { recursive: true, force: true });
const sources = [...walk(join(root, 'src')), ...walk(join(root, 'tests'))].filter(
  file => file.endsWith('.ts') && !file.endsWith('.d.ts')
);

for (const file of sources) {
  const { outputText, diagnostics } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, verbatimModuleSyntax: false },
    fileName: file,
    reportDiagnostics: true
  });
  if (diagnostics?.length) {
    console.error(ts.formatDiagnostics(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
    process.exit(1);
  }
  const target = join(out, relative(root, file)).replace(/\.ts$/, '.js');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, addJsExtensions(outputText, file));
}
writeFileSync(join(out, 'package.json'), '{"type":"module"}\n');

const testFiles = walk(join(out, 'tests')).filter(file => file.endsWith('.test.js'));
const result = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
process.exit(result.status ?? 1);
