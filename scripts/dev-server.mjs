/* Local development host for the Worker bundle.
   It serves dist/server/index.js on Node so the UI and /api/assistant run from
   one origin, reads secrets from .dev.vars, and supplies the identity header
   that the hosting platform normally adds. It is a development tool: it is not
   deployed, and it is not an authentication layer. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';

const root = process.cwd();
const port = Number(process.env.PORT || 8787);
const bundle = path.join(root, 'dist/server/index.js');

if (!fs.existsSync(bundle)) {
  console.error('Build the worker first: node scripts/build-ai.mjs');
  process.exit(1);
}

/* Secrets stay in .dev.vars, which is gitignored. */
function readVars(file) {
  const vars = {};
  if (!fs.existsSync(file)) return vars;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const at = trimmed.indexOf('=');
    if (at < 1) continue;
    vars[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1).trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

const env = {...readVars(path.join(root, '.dev.vars')), ...process.env};

/* The bundle is a module, while package.json declares commonjs for the UMD
   files, so it is loaded through a module copy rather than changing the build
   output that is deployed. */
const moduleCopy = path.join(os.tmpdir(), 'samanvay-worker.' + process.pid + '.mjs');
fs.writeFileSync(moduleCopy, fs.readFileSync(bundle));
process.on('exit', () => {try {fs.unlinkSync(moduleCopy)} catch {}});
const worker = (await import(pathToFileURL(moduleCopy).href)).default;

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const origin = 'http://localhost:' + port;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  /* Supplied by the hosting identity layer in a real deployment. */
  if (!headers.get('oai-authenticated-user-id')) headers.set('oai-authenticated-user-id', 'local-development');
  if (req.method === 'POST' && !headers.get('origin')) headers.set('origin', origin);

  try {
    const response = await worker.fetch(new Request(origin + req.url, {method: req.method, headers, body}), env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(req.method, req.url, error);
    res.statusCode = 500;
    res.end('Local development server error');
  }
});

server.listen(port, () => {
  console.log('Samanvay worker on http://localhost:' + port);
  console.log('GEMINI_API_KEY ' + (env.GEMINI_API_KEY ? 'loaded from .dev.vars' : 'missing: the assistant returns 503'));
  console.log('GEMINI_MODEL ' + (env.GEMINI_MODEL || 'gemini-3.1-flash-lite (default)'));
});
