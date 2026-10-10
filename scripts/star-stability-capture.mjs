import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'validation', 'star-stability');
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST' || req.url !== '/capture') { res.writeHead(404).end(); return; }
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 12_000_000) throw new Error('Capture exceeds 12 MB');
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const { phase, name, report, frames } = data;
    if (!['before', 'after'].includes(phase) || !/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid capture name');
    const directory = join(root, phase);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${name}.json`), JSON.stringify(report, null, 2));
    for (const [label, png] of Object.entries(frames)) {
      if (!/^[a-z0-9-]+$/.test(label) || typeof png !== 'string') throw new Error('Invalid frame');
      await writeFile(join(directory, `${name}-${label}.png`), Buffer.from(png, 'base64'));
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('saved');
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end(String(error));
  }
});
server.listen(4174, '127.0.0.1', () => console.log(`Star captures: ${root}`));
