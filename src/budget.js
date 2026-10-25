import { DurableObject } from "cloudflare:workers";
import { reserve, settle } from "./budget-core.js";

// One SQLite-backed object per UTC day. Stores counts and salted visitor hashes only.
export class Budget extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS counts (k TEXT PRIMARY KEY, n REAL NOT NULL)");
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

  async reserve(visitor, video, amount) {
    const r = reserve(this.store, visitor, video, amount);
    if (r.ok && !(await this.ctx.storage.getAlarm())) {
      await this.ctx.storage.setAlarm(Date.now() + 36 * 3600 * 1000);
    }
    return r;
  }

  async settle(delta) {
    return settle(this.store, delta);
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
