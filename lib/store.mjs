import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import * as v from './validate.mjs';
import { auditPlan } from './quality.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_ROOT = path.join(REPO, 'private');
export const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function atomic(file, value) {
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(tmp, file);
  } finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
function immutable(file, value) {
  // Caller holds the root write lock; atomic rename prevents partial JSON after interruption.
  v.assert(!fs.existsSync(file), `Record already exists: ${path.basename(file)}`);
  atomic(file, value);
}
function withoutMetadata(value) {
  const result = { ...value }; delete result.created_at; return result;
}
export function effective(records) {
  const replaced = new Set(records.map(r => r.supersedes).filter(Boolean));
  return records.filter(r => !replaced.has(r.id));
}
export class Store {
  constructor(root = DEFAULT_ROOT) { this.root = path.resolve(root); }
  file(...parts) { return path.join(this.root, ...parts); }
  locked(fn) {
    fs.mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const lock = this.file('.write-lock');
    try { fs.mkdirSync(lock); }
    catch (e) { if (e.code === 'EEXIST') throw new Error('Another write is active or a previous write was interrupted. See docs/COMMANDS.md for lock recovery.'); throw e; }
    try { return fn(); } finally { fs.rmdirSync(lock); }
  }
  initialized() { return fs.existsSync(this.file('profile.json')); }
  init(timezone = 'UTC') {
    return this.locked(() => {
      for (const dir of ['logs', 'plans', 'reviews', 'profile-history', 'drafts']) fs.mkdirSync(this.file(dir), { recursive: true, mode: 0o700 });
      for (const kind of v.kinds) fs.mkdirSync(this.file('logs', kind), { recursive: true, mode: 0o700 });
      if (!this.initialized()) {
        const p = read(path.join(REPO, 'templates/profile.json'));
        p.timezone = timezone; p.revision = 1; v.profile(p);
        immutable(this.file('profile-history', '1.json'), p); atomic(this.file('profile.json'), p);
      }
      for (const [name, content] of Object.entries({ 'preferences.md': '# Preferences\n\nRecord user-stated coaching and output preferences here.\n', 'context.md': '# Current context\n\nOnboarding has not been completed.\n' })) {
        if (!fs.existsSync(this.file(name))) fs.writeFileSync(this.file(name), content, { mode: 0o600, flag: 'wx' });
      }
      return this.profile();
    });
  }
  profile() {
    v.assert(this.initialized(), 'Run node fitness.mjs init first');
    return v.profile(read(this.file('profile.json')));
  }
  importProfile(input) {
    return this.locked(() => {
      const current = this.profile(); v.profile(input);
      v.assert(input.revision === current.revision, 'Stale profile revision; read the current profile and merge your changes');
      if (isDeepStrictEqual(current, input)) return current;
      const versions = fs.readdirSync(this.file('profile-history')).filter(f => /^\d+\.json$/.test(f)).map(f => Number(f.slice(0,-5)));
      const next = { ...input, revision: Math.max(current.revision, ...versions) + 1 };
      immutable(this.file('profile-history', `${next.revision}.json`), next); atomic(this.file('profile.json'), next);
      return next;
    });
  }
  list(folder) {
    if (!fs.existsSync(this.file(folder))) return [];
    return fs.readdirSync(this.file(folder)).filter(f => f.endsWith('.json')).sort().map(f => read(this.file(folder, f)));
  }
  logs(kind, raw = false) {
    v.assert(v.kinds.includes(kind), 'Unknown log kind');
    const records = this.list(`logs/${kind}`);
    const day = v.today(this.profile().timezone);
    const byId = new Map(records.map(r => [r.id, r]));
    v.assert(byId.size === records.length, 'Duplicate log IDs');
    const replaced = new Set();
    for (const record of records) {
      v.log(kind, record, day);
      if (record.supersedes) {
        const prior = byId.get(record.supersedes);
        v.assert(prior && prior.date === record.date, 'Correction reference missing or date mismatch');
        v.assert(!replaced.has(record.supersedes), 'Correction branches are not allowed'); replaced.add(record.supersedes);
        const seen = new Set([record.id]); let cursor = prior;
        while (cursor) { v.assert(!seen.has(cursor.id), 'Correction cycle'); seen.add(cursor.id); cursor = byId.get(cursor.supersedes); }
      }
    }
    const active = effective(records); const unique = new Set();
    for (const record of active) {
      const key = kind === 'workout' ? (record.session_key ? `${record.plan_id}:${record.session_key}` : null)
        : kind === 'nutrition' ? (record.complete_day ? record.date : null) : record.date;
      if (key) { v.assert(!unique.has(key), 'Duplicate active day/session records'); unique.add(key); }
    }
    return (raw ? records : active).sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }
  getPlan(planId) {
    v.id(planId); return v.plan(read(this.file('plans', `${planId}.json`)));
  }
  active() {
    const pointer = this.file('active.json');
    if (!fs.existsSync(pointer)) return null;
    const value = read(pointer); v.id(value.plan_id);
    return { ...value, plan: this.getPlan(value.plan_id) };
  }
  saveLog(kind, input) {
    return this.locked(() => {
      v.object(input, 'log input');
      v.assert(input.schema_version == null || input.schema_version === 1, 'Unsupported schema_version');
      const p = this.profile(); const now = v.today(p.timezone);
      const record = { ...input, schema_version: 1, kind, id: input.id ?? randomUUID(), created_at: new Date().toISOString() };
      v.log(kind, record, now);
      const file = this.file('logs', kind, `${record.id}.json`);
      if (fs.existsSync(file)) {
        const previous = read(file);
        v.assert(isDeepStrictEqual(withoutMetadata(record), withoutMetadata(previous)), 'ID already used by different content; use a correction with supersedes');
        return previous;
      }
      const active = this.logs(kind);
      if (record.supersedes) {
        const previous = active.find(r => r.id === record.supersedes);
        v.assert(previous && previous.date === record.date, 'Correction must supersede an active record of the same kind and date');
      }
      const sameDay = active.filter(r => r.date === record.date && r.id !== record.supersedes);
      if (['measurement','recovery'].includes(kind) || (kind === 'nutrition' && record.complete_day)) {
        v.assert(!sameDay.some(r => kind !== 'nutrition' || r.complete_day), 'A daily record already exists; use supersedes to correct it');
      }
      if (kind === 'workout' && record.plan_id != null) {
        const plan = this.getPlan(record.plan_id);
        if (record.session_key) {
          const session = plan.sessions.find(s => s.key === record.session_key);
          v.assert(session, 'session_key does not exist in the referenced plan');
          v.assert(!active.some(r => r.id !== record.supersedes && r.plan_id === record.plan_id && r.session_key === record.session_key), 'This scheduled session already has an outcome; correct it with supersedes');
        }
      }
      immutable(file, record); return record;
    });
  }
  savePlan(input) {
    return this.locked(() => {
      v.object(input, 'plan input');
      v.assert(input.schema_version == null || input.schema_version === 1, 'Unsupported schema_version');
      const profile = this.profile();
      v.assert(input.profile_revision == null || input.profile_revision === profile.revision, 'Draft refers to a stale profile revision; review against the current profile');
      const record = { ...input, schema_version: 1, profile_revision: profile.revision, created_at: new Date().toISOString() };
      v.plan(record);
      if (record.parent_id) this.getPlan(record.parent_id);
      const file = this.file('plans', `${record.id}.json`);
      if (fs.existsSync(file)) {
        const previous = read(file);
        v.assert(isDeepStrictEqual(withoutMetadata(record), withoutMetadata(previous)), 'Plan ID already exists; create a new revision ID');
        return previous;
      }
      immutable(file, record); return record;
    });
  }
  activate(planId) {
    return this.locked(() => {
      const profile = this.profile(); const plan = this.getPlan(planId);
      const issues = v.planningIssues(profile);
      v.assert(!issues.length, `Planning prerequisites incomplete: ${issues.join('; ')}`);
      v.assert(plan.profile_revision === profile.revision, 'Profile changed since this plan was saved; review it and save a new version');
      v.assert(plan.end_date >= v.today(profile.timezone), 'Cannot activate an expired plan');
      if (plan.nutrition.approach === 'targets') {
        v.assert(profile.safety.energy_restriction_appropriate != null, 'Assess suitability for energy restriction before activating numeric targets');
      }
      if (plan.nutrition.energy_strategy === 'deficit') {
        v.assert(profile.safety.energy_restriction_appropriate === true && profile.safety.needs_professional_guidance === false, 'Do not activate an autonomous deficit when restriction is unsuitable, uncertain, or requires professional guidance');
      }
      const audit = auditPlan(plan,profile);
      v.assert(audit.ok, `Plan quality checks incomplete: ${audit.issues.join('; ')}`);
      const active = { plan_id: planId, activated_at: new Date().toISOString() };
      atomic(this.file('active.json'), active); return active;
    });
  }
  saveReview(input) {
    return this.locked(() => {
      v.object(input, 'review input');
      v.assert(input.schema_version == null || input.schema_version === 1, 'Unsupported schema_version');
      const profile = this.profile();
      const record = { ...input, schema_version: 1, created_at: new Date().toISOString() };
      v.review(record); this.getPlan(record.plan_id);
      v.assert(record.date <= v.today(profile.timezone), 'Reviews cannot be future-dated');
      const file = this.file('reviews', `${record.id}.json`);
      if (fs.existsSync(file)) {
        const previous = read(file);
        v.assert(isDeepStrictEqual(withoutMetadata(record), withoutMetadata(previous)), 'Review ID already exists; use a new ID');
        return previous;
      }
      immutable(file, record); return record;
    });
  }
  status(onDate) {
    if (!this.initialized()) return { initialized: false, next_action: 'Run init, then start onboarding' };
    const profile = this.profile(); const day = onDate ?? v.today(profile.timezone); v.date(day);
    const active = this.active();
    const review = active && this.list('reviews').filter(r => r.plan_id === active.plan_id && r.date <= day).sort((a,b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))[0];
    const due = review?.next_review_date ?? active?.plan.review_date ?? null;
    return { initialized: true, date: day, data_directory: this.root, profile_revision: profile.revision,
      planning_issues: v.planningIssues(profile), active_plan: active?.plan_id ?? null,
      profile_changed_since_plan: active ? active.plan.profile_revision !== profile.revision : false,
      active_plan_quality_issues: active ? auditPlan(active.plan,profile).issues : [],
      plan_starts: active?.plan.start_date ?? null, plan_ends: active?.plan.end_date ?? null,
      plan_expired: active ? day > active.plan.end_date : false,
      next_microcycle_needed: active ? day > active.plan.microcycle_end_date && day <= active.plan.end_date : false,
      next_review: due, review_due: due ? day >= due : false };
  }
  doctor() {
    const errors = []; const capture = (label, fn) => { try { fn(); } catch (e) { errors.push(`${label}: ${e.message}`); } };
    capture('profile', () => this.profile());
    if (!this.initialized()) return { ok: false, errors };
    let day = v.today(); capture('timezone', () => { day = v.today(this.profile().timezone); });
    for (const kind of v.kinds) {
      capture(`logs/${kind}`, () => {
        const records = this.logs(kind, true); const ids = new Set(records.map(r => r.id));
        for (const r of records) capture(r.id, () => {
          v.log(kind, r, day);
          if (r.supersedes) {
            v.assert(ids.has(r.supersedes), 'Correction reference missing');
            const prior = records.find(x => x.id === r.supersedes);
            v.assert(prior.date === r.date, 'Correction date mismatch');
            v.assert(records.filter(x => x.supersedes === r.supersedes).length === 1, 'Correction branches are not allowed');
            const visited = new Set([r.id]); let cursor = prior;
            while (cursor) { v.assert(!visited.has(cursor.id), 'Correction cycle'); visited.add(cursor.id); cursor = records.find(x => x.id === cursor.supersedes); }
          }
          if (r.plan_id) {
            const plan = this.getPlan(r.plan_id);
            if (r.session_key) v.assert(plan.sessions.some(s => s.key === r.session_key), 'Missing scheduled session');
          }
        });
        const daily = effective(records).filter(r => kind !== 'nutrition' || r.complete_day);
        if (kind !== 'workout') v.assert(new Set(daily.map(r => r.date)).size === daily.length, 'Duplicate active daily entries');
      });
    }
    capture('plans', () => {
      for (const p of this.list('plans')) capture(p.id, () => {
        v.plan(p); v.assert(fs.existsSync(this.file('profile-history', `${p.profile_revision}.json`)), 'Missing profile revision');
        const visited = new Set([p.id]); let parent = p.parent_id;
        while (parent) { v.assert(!visited.has(parent), 'Plan ancestry cycle'); visited.add(parent); parent = this.getPlan(parent).parent_id; }
      });
    });
    capture('reviews', () => { for (const r of this.list('reviews')) { v.review(r); this.getPlan(r.plan_id); v.assert(r.date <= day, 'Future review'); } });
    capture('active plan', () => this.active());
    capture('profile history', () => { for (const p of this.list('profile-history')) v.profile(p); });
    return { ok: errors.length === 0, errors, note: 'Structural integrity only; this does not assess medical suitability or the quality of prescriptions.' };
  }
}
