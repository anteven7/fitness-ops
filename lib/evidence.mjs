import fs from 'node:fs';
import { assert, date, string } from './validate.mjs';

export const registry = JSON.parse(fs.readFileSync(new URL('../evidence/sources.json', import.meta.url), 'utf8'));
export function sources(id) {
  if (!id) return registry.sources;
  const source = registry.sources.find(s => s.id === id);
  assert(source, `Unknown evidence ID: ${id}`);
  return source;
}
export function validateRegistry() {
  const ids = new Set();
  for (const source of registry.sources) {
    for (const key of ['id','title','url','publication','evidence_type','population','domain','supports','limitations','access_scope']) string(source[key], `source.${key}`);
    assert(!ids.has(source.id), `Duplicate evidence ID: ${source.id}`); ids.add(source.id);
    assert(new URL(source.url).protocol === 'https:', 'Evidence links must use HTTPS');
    date(source.checked_on);
  }
  return { ok: true, sources: ids.size };
}
