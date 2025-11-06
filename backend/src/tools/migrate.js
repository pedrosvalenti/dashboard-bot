import { pool } from '../../src/db.js';
import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.resolve('sql/schema.sql'), 'utf-8');

(async () => {
  try {
    const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('Migration complete.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
