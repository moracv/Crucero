// Genera los íconos PNG de la PWA (sin dependencias): un barco sobre el mar al atardecer.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size);
      row.set([r, g, b, 255], 1 + x * 4);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function scene(u, v) {
  // cielo
  let c = mix([255, 170, 110], [14, 116, 144], Math.min(1, v / 0.62));
  // sol
  if (Math.hypot(u - 0.5, v - 0.42) < 0.17) c = [255, 214, 120];
  // casco del barco (trapecio)
  if (v > 0.5 && v < 0.62 && u > 0.2 + (v - 0.5) * 0.6 && u < 0.8 - (v - 0.5) * 0.6) c = [255, 255, 255];
  // cubiertas
  if (v > 0.42 && v < 0.5 && u > 0.3 && u < 0.68) c = [255, 255, 255];
  if (v > 0.36 && v < 0.42 && u > 0.38 && u < 0.6) c = [255, 255, 255];
  // chimenea
  if (v > 0.29 && v < 0.36 && u > 0.5 && u < 0.56) c = [249, 115, 22];
  // ventanas
  if (v > 0.445 && v < 0.47 && u > 0.33 && u < 0.65 && Math.floor(u * 40) % 2 === 0) c = [14, 116, 144];
  // mar con olas
  const wave = 0.62 + 0.012 * Math.sin(u * 30);
  if (v > wave) c = mix([8, 145, 178], [12, 74, 110], (v - 0.62) / 0.38);
  return c;
}
writeFileSync('public/icon-192.png', png(192, scene));
writeFileSync('public/icon-512.png', png(512, scene));
// maskable: escena con más margen
writeFileSync('public/icon-maskable-512.png', png(512, (u, v) => scene(0.5 + (u - 0.5) * 1.25, 0.5 + (v - 0.5) * 1.25)));
writeFileSync('public/apple-touch-icon.png', png(180, scene));
console.log('Íconos generados en public/');
