/**
 * Export assets from an existing Figma file using Figma REST API.
 * Requires env FIGMA_TOKEN set (use scripts/fetch-figma-token.sh to export shell value),
 * and FIGMA_FILE_KEY provided via env or CLI arg.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const token = process.env.FIGMA_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY || process.argv[2];
if (!token) {
  throw new Error('FIGMA_TOKEN not set. Run npm run fetch:token:cli and eval the export, or set FIGMA_TOKEN.');
}
if (!fileKey) {
  throw new Error('Provide FIGMA_FILE_KEY (env) or pass as arg: node scripts/dist/export-assets.js <FILE_KEY>');
}

const distDir = join(process.cwd(), 'dist', 'exports');
mkdirSync(distDir, { recursive: true });

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': token as string },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchBuffer(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': token as string },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API error ${res.status}: ${text}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function main() {
  // Get file nodes to find Logo variants by name
  const file = await fetchJson(`https://api.figma.com/v1/files/${fileKey}`);
  // Traverse to locate nodes named 'Logo', or specific variants
  const map: Record<string, string> = {};
  function walk(node: any) {
    if (node && node.name) {
      if (node.name === 'Logo' && node.id) map['Logo'] = node.id;
      if (node.name === 'Logo/Primary' && node.id) map['Logo/Primary'] = node.id;
      if (node.name === 'Logo/Lockup/Horizontal' && node.id) map['Logo/Lockup/Horizontal'] = node.id;
      if (node.name === 'Logo/Lockup/Stacked' && node.id) map['Logo/Lockup/Stacked'] = node.id;
    }
    if (node.children) node.children.forEach(walk);
  }
  walk(file.document);

  const toExport: Array<{ name: string; id: string; format: 'svg' | 'pdf' }> = [];
  const pairs: Array<[string, string]> = [
    ['Logo/Primary', 'logo-primary'],
    ['Logo/Lockup/Horizontal', 'logo-lockup-horizontal'],
    ['Logo/Lockup/Stacked', 'logo-lockup-stacked'],
  ];

  for (const [nodeName] of pairs) {
    const id = map[nodeName];
    if (!id) continue;
    toExport.push({ name: nodeName, id, format: 'svg' });
    toExport.push({ name: nodeName, id, format: 'pdf' });
  }

  for (const item of toExport) {
    const images = await fetchJson(
      `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(item.id)}&format=${item.format}`
    );
    const url: string | undefined = images.images?.[item.id];
    if (!url) continue;
    const bytes = await fetchBuffer(url);
    const outName = pairs.find(([n]) => n === item.name)?.[1] || item.name.replace(/\W+/g, '-').toLowerCase();
    const filename = join(distDir, `${outName}.${item.format}`);
    writeFileSync(filename, Buffer.from(bytes));
    console.log('Exported', filename);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
