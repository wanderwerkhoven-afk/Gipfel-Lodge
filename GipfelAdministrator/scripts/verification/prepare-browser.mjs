import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createBrotliDecompress } from 'node:zlib';

const root = resolve('.');
const output = resolve(root, 'browser-tmp');
const source = resolve(root, 'node_modules/@sparticuz/chromium/bin');
await mkdir(output, { recursive: true });

async function decompress(input, target, mode) {
  if (existsSync(target)) return;
  await new Promise((resolveStream, reject) => {
    const reader = createReadStream(input); const writer = createWriteStream(target, { mode }); const brotli = createBrotliDecompress();
    reader.once('error', reject); brotli.once('error', reject); writer.once('error', reject); writer.once('close', resolveStream);
    reader.pipe(brotli).pipe(writer);
  });
}

await decompress(resolve(source, 'chromium.br'), resolve(output, 'chromium'), 0o700);
const swiftshaderTar = resolve(output, 'swiftshader.tar');
await decompress(resolve(source, 'swiftshader.tar.br'), swiftshaderTar, 0o600);
if (!existsSync(resolve(output, 'libGLESv2.so'))) {
  const extracted = spawnSync('tar', ['--no-same-owner', '-xf', swiftshaderTar, '-C', output], { stdio: 'inherit' });
  if (extracted.status !== 0) process.exit(extracted.status ?? 1);
}
console.log(`Chromium voorbereid: ${resolve(output, 'chromium')}`);
