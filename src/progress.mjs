import { CARD_TYPES, MISSIONS } from './missions.mjs';

const KEY = 'luisir-array-drafts-v2';
const validMission = (id, v) => Number.isInteger(id) && id >= 0 && id < MISSIONS.length && Number.isInteger(v) && v >= 0 && v < (MISSIONS[id].variants?.length || 1);
export function validDraft(d) {
  return !!d && ['scaffold','arrange','blank'].includes(d.mode) &&
    Array.isArray(d.cards) && d.cards.length <= 200 && d.cards.every(c =>
      c && Object.hasOwn(CARD_TYPES,c.op) && Number.isInteger(c.depth) && c.depth >= 0 && c.depth <= 8 &&
      c.args && Object.keys(c.args).length === Object.keys(CARD_TYPES[c.op].args).length &&
      Object.keys(CARD_TYPES[c.op].args).every(k => typeof c.args[k] === 'string' && c.args[k].length <= 500)) &&
    typeof d.prediction === 'string' && d.prediction.length <= 500 && typeof d.locked === 'boolean' &&
    Array.isArray(d.selected) && d.selected.length <= 2 && d.selected.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isInteger(n) && n >= 0 && n < 10));
}
export function readProgress(storage) {
  try {
    const value = JSON.parse(storage.getItem(KEY));
    if (!value || value.version !== 2 || !validMission(value.id,value.v)) return null;
    const drafts = {};
    for (const [key,draft] of Object.entries(value.drafts || {})) {
      const [id,v] = key.split(':').map(Number);
      if (key === `${id}:${v}` && validMission(id,v) && validDraft(draft)) drafts[key] = draft;
    }
    return { version:2, id:value.id, v:value.v, drafts };
  } catch { return null; }
}
export function writeProgress(storage, progress) {
  try { storage.setItem(KEY,JSON.stringify(progress)); return true; } catch { return false; }
}
