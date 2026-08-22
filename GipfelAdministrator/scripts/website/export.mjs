import { mkdir, writeFile, readFile } from 'node:fs/promises';
const out = new URL('../../publications/preview/', import.meta.url);
await mkdir(out, { recursive: true });
const copy = {
  nl: ['Gipfel Lodge E4', 'Ruimte om boven alles uit te stijgen', 'Bekijk beschikbaarheid'],
  de: ['Gipfel Lodge E4', 'Raum, um über allem zu stehen', 'Verfügbarkeit ansehen'],
  en: ['Gipfel Lodge E4', 'Space to rise above it all', 'View availability']
};
for (const [locale, [title, tagline, cta]] of Object.entries(copy)) {
  const html = `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><meta name="description" content="Premium alpine lodge in Eben im Pongau"><body><main><p>EBEN IM PONGAU · AUSTRIA</p><h1>${title}</h1><h2>${tagline}</h2><a href="#booking">${cta}</a></main></body></html>`;
  if (/guest|reservation|secret|admin/i.test(html)) throw new Error('Publicatie bevat verboden data');
  await writeFile(new URL(`${locale}.html`, out), html);
}
for (const locale of Object.keys(copy)) if (!(await readFile(new URL(`${locale}.html`, out), 'utf8')).includes(`<html lang="${locale}">`)) throw new Error('Exportcontrole mislukt');
console.log('Website-export OK — NL/DE/EN allowlisted preview gegenereerd.');
