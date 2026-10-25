import { DurableObject } from "cloudflare:workers";
import { reserve, settle, countHit } from "./budget-core.js";

const CACHE_ROWS = 20000;

// One SQLite-backed object per UTC day stores counts and salted visitor hashes only; it deletes itself
// about 36 hours later. One more object, named "cache", maps a SHA-256 of a composite to the model's short
// answer (never the image), so the same picture never costs neurons twice.
export class Budget extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS counts (k TEXT PRIMARY KEY, n REAL NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS answers (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)");
    this.store = {
      get: (k) => {
        const row = this.sql.exec("SELECT n FROM counts WHERE k = ?", k).toArray()[0];
        return row ? row.n : 0;
      },
      set: (k, v) => {
        this.sql.exec("INSERT INTO counts (k, n) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET n = excluded.n", k, v);
      },
    };
  }

  async expireLater() {
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + 36 * 3600 * 1000);
  }

  async reserve(visitor, video, amount, cap) {
    const r = reserve(this.store, visitor, video, amount, cap);
    if (r.ok) await this.expireLater();
    return r;
  }

  async countHit(visitor) {
    const r = countHit(this.store, visitor);
    if (r.ok) await this.expireLater();
    return r;
  }

  async settle(delta) {
    return settle(this.store, delta);
  }

  async cacheGet(k) {
    const row = this.sql.exec("SELECT v FROM answers WHERE k = ?", k).toArray()[0];
    return row ? JSON.parse(row.v) : null;
  }

  async cachePut(k, v) {
    this.sql.exec("INSERT INTO answers (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO NOTHING", k, JSON.stringify(v), Date.now());
    const n = this.sql.exec("SELECT COUNT(*) AS n FROM answers").toArray()[0].n;
    if (n > CACHE_ROWS) this.sql.exec("DELETE FROM answers WHERE k IN (SELECT k FROM answers ORDER BY at LIMIT ?)", n - CACHE_ROWS);
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
