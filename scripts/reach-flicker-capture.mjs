import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = join(process.cwd(), 'validation', 'flicker');
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST' || req.url !== '/capture') { res.writeHead(404).end(); return; }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 25_000_000) throw new Error('Capture too large');
      chunks.push(chunk);
    }
    const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Array.isArray(report.samples) || !Number.isInteger(report.width)
      || !Number.isInteger(report.height) || !['halley', 'halley-raw', 'halley-radius', 'm27'].includes(report.label))
      throw new Error('Invalid capture');
    await mkdir(directory, { recursive: true });
    for (const [label, png] of Object.entries(report.pngs ?? {})) {
      if (!/^(first|middle|last|f\d{2})$/.test(label) || typeof png !== 'string') continue;
      await writeFile(join(directory, `${report.label}-${label}.png`), Buffer.from(png, 'base64'));
    }
    delete report.pngs;
    await writeFile(join(directory, `${report.label}-capture.json`), JSON.stringify(report, null, 2));
    res.writeHead(200).end('saved');
  } catch (error) {
    res.writeHead(400).end(String(error));
  }
}).listen(4175, '127.0.0.1', () => console.log(`Reach flicker captures: ${directory}`));
