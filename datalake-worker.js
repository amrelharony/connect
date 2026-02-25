// datalake-worker.js — OPFS SQLite Data Lake Worker
// Runs wa-sqlite inside a Web Worker with OPFS VFS for async, persistent storage.
import SQLiteESMFactory from 'https://cdn.jsdelivr.net/npm/wa-sqlite@1.0.0/dist/wa-sqlite.mjs';
import * as SQLite from 'https://cdn.jsdelivr.net/npm/wa-sqlite@1.0.0/src/sqlite-api.js';
import { AccessHandlePoolVFS } from 'https://cdn.jsdelivr.net/npm/wa-sqlite@1.0.0/src/examples/AccessHandlePoolVFS.js';

const VFS_DIR = 'amros-lake';
const DB_NAME = 'amros_datalake.db';
const HEADER_OFFSET_DATA = 4096;
const HEADER_MAX_PATH_SIZE = 512;
let sqlite3 = null;
let db = null;
let ready = false;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (
  store TEXT NOT NULL,
  key   TEXT NOT NULL,
  value TEXT,
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (store, key)
);
CREATE TABLE IF NOT EXISTS scores (
  game      TEXT PRIMARY KEY,
  score     INTEGER NOT NULL,
  player    TEXT,
  played_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS events (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  data TEXT,
  ts   INTEGER DEFAULT (strftime('%s','now'))
);
`;

async function init() {
  const module = await SQLiteESMFactory();
  sqlite3 = SQLite.Factory(module);

  const vfs = new AccessHandlePoolVFS(VFS_DIR);
  await vfs.isReady;
  sqlite3.vfs_register(vfs, true);

  db = await sqlite3.open_v2(DB_NAME);
  await sqlite3.exec(db, SCHEMA);
  ready = true;
}

async function execSQL(sql, params) {
  const rows = [];
  const columns = [];
  if (params && params.length) {
    const str = sqlite3.str_new(db, sql);
    try {
      const prepared = await sqlite3.prepare_v2(db, sqlite3.str_value(str));
      if (prepared) {
        const stmt = prepared.stmt;
        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          if (p === null) sqlite3.bind_null(stmt, i + 1);
          else if (typeof p === 'number') {
            if (Number.isInteger(p)) sqlite3.bind_int(stmt, i + 1, p);
            else sqlite3.bind_double(stmt, i + 1, p);
          } else sqlite3.bind_text(stmt, i + 1, String(p));
        }
        const nCols = sqlite3.column_count(stmt);
        for (let c = 0; c < nCols; c++) columns.push(sqlite3.column_name(stmt, c));
        while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
          const row = {};
          for (let c = 0; c < nCols; c++) {
            row[columns[c]] = sqlite3.column(stmt, c);
          }
          rows.push(row);
        }
        await sqlite3.finalize(stmt);
      }
    } finally {
      sqlite3.str_finish(str);
    }
  } else {
    await sqlite3.exec(db, sql, (row, cols) => {
      if (!columns.length) columns.push(...cols);
      const obj = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      rows.push(obj);
    });
  }
  return { rows, columns };
}

async function kvGet(store, key) {
  const r = await execSQL(
    "SELECT value FROM kv WHERE store=?1 AND key=?2", [store, key]
  );
  return r.rows.length ? r.rows[0].value : null;
}

async function kvPut(store, key, value) {
  await execSQL(
    "INSERT OR REPLACE INTO kv(store,key,value,updated_at) VALUES(?1,?2,?3,strftime('%s','now'))",
    [store, key, typeof value === 'string' ? value : JSON.stringify(value)]
  );
}

async function kvGetAll(store) {
  return (await execSQL("SELECT key, value FROM kv WHERE store=?1", [store])).rows;
}

async function kvDelete(store, key) {
  await execSQL("DELETE FROM kv WHERE store=?1 AND key=?2", [store, key]);
}

async function insertScore(game, score, player) {
  await execSQL(
    "INSERT OR REPLACE INTO scores(game,score,player,played_at) VALUES(?1,?2,?3,strftime('%s','now'))",
    [game, score, player || 'Anon']
  );
}

async function logEvent(type, data) {
  await execSQL(
    "INSERT INTO events(type,data,ts) VALUES(?1,?2,strftime('%s','now'))",
    [type, typeof data === 'string' ? data : JSON.stringify(data)]
  );
}

async function getStats() {
  const kvCount = (await execSQL("SELECT COUNT(*) as c FROM kv")).rows[0]?.c || 0;
  const scoreCount = (await execSQL("SELECT COUNT(*) as c FROM scores")).rows[0]?.c || 0;
  const eventCount = (await execSQL("SELECT COUNT(*) as c FROM events")).rows[0]?.c || 0;
  const stores = (await execSQL("SELECT DISTINCT store FROM kv")).rows.map(r => r.store);
  const pageSize = (await execSQL("PRAGMA page_size")).rows[0]?.page_size || 4096;
  const pageCount = (await execSQL("PRAGMA page_count")).rows[0]?.page_count || 0;
  const dbSize = pageSize * pageCount;
  return { kvCount, scoreCount, eventCount, stores, dbSize };
}

async function exportDB() {
  await sqlite3.exec(db, 'PRAGMA wal_checkpoint(TRUNCATE)');

  const dbPath = new URL(DB_NAME, 'file://localhost/').pathname;
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(VFS_DIR);

  for await (const [, handle] of dir) {
    if (handle.kind !== 'file') continue;
    const fh = await handle.getFile();
    if (fh.size <= HEADER_OFFSET_DATA) continue;

    const headerBuf = await fh.slice(0, HEADER_MAX_PATH_SIZE).arrayBuffer();
    const pathBytes = new Uint8Array(headerBuf);
    const nullIdx = pathBytes.indexOf(0);
    const storedPath = new TextDecoder().decode(pathBytes.subarray(0, nullIdx > 0 ? nullIdx : 0));
    if (storedPath !== dbPath) continue;

    const dataBuf = await fh.slice(HEADER_OFFSET_DATA).arrayBuffer();
    return dataBuf;
  }

  throw new Error('DB file not found in OPFS pool');
}

async function migrate(data) {
  await sqlite3.exec(db, 'BEGIN TRANSACTION');
  try {
    for (const [store, entries] of Object.entries(data)) {
      if (store.startsWith('_')) continue;
      if (typeof entries !== 'object' || entries === null) continue;
      for (const [key, value] of Object.entries(entries)) {
        await kvPut(store, key, value);
      }
    }
    if (data._scores) {
      for (const [game, score] of Object.entries(data._scores)) {
        await insertScore(game, typeof score === 'number' ? score : 0, data._player || 'Anon');
      }
    }
    await sqlite3.exec(db, 'COMMIT');
  } catch (e) {
    await sqlite3.exec(db, 'ROLLBACK');
    throw e;
  }
}

async function batchPut(ops) {
  await sqlite3.exec(db, 'BEGIN TRANSACTION');
  try {
    for (const op of ops) {
      if (op.type === 'put') await kvPut(op.store, op.key, op.value);
      else if (op.type === 'score') await insertScore(op.game, op.score, op.player);
      else if (op.type === 'event') await logEvent(op.eventType, op.data);
      else if (op.type === 'delete') await kvDelete(op.store, op.key);
    }
    await sqlite3.exec(db, 'COMMIT');
  } catch (e) {
    await sqlite3.exec(db, 'ROLLBACK');
    throw e;
  }
}

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    let result = null;
    switch (type) {
      case 'init':
        await init();
        result = { ok: true };
        break;
      case 'get':
        result = await kvGet(e.data.store, e.data.key);
        break;
      case 'put':
        await kvPut(e.data.store, e.data.key, e.data.value);
        result = { ok: true };
        break;
      case 'getAll':
        result = await kvGetAll(e.data.store);
        break;
      case 'delete':
        await kvDelete(e.data.store, e.data.key);
        result = { ok: true };
        break;
      case 'exec': {
        result = await execSQL(e.data.sql, e.data.params || []);
        break;
      }
      case 'score':
        await insertScore(e.data.game, e.data.score, e.data.player);
        result = { ok: true };
        break;
      case 'event':
        await logEvent(e.data.eventType, e.data.data);
        result = { ok: true };
        break;
      case 'stats':
        result = await getStats();
        break;
      case 'export': {
        const buf = await exportDB();
        self.postMessage({ id, result: buf }, [buf]);
        return;
      }
      case 'migrate':
        await migrate(e.data.data);
        result = { ok: true, migrated: true };
        break;
      case 'batch':
        await batchPut(e.data.ops);
        result = { ok: true };
        break;
      default:
        throw new Error('Unknown message type: ' + type);
    }
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: err.message || String(err) });
  }
};
