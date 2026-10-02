import * as SQLite from 'expo-sqlite';

export type DocType = 'outline' | 'textbook' | 'notes' | 'other';

export interface Unit {
  id: number;
  code: string;
  name: string;
  color: string;
  lecturer: string | null;
}

export interface LockerDocument {
  id: number;
  unit_id: number;
  type: DocType;
  title: string;
  file_path: string;
  added_at: number;
}

export interface TimetableSlot {
  id: number;
  unit_id: number;
  day: number; // 1 = Monday ... 7 = Sunday
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'
  venue: string | null;
}

export interface IdCard {
  id: number;
  label: string;
  file_path: string;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = openAndMigrate();
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('locker.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#4F46E5',
      lecturer TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS timetable_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      day INTEGER NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      venue TEXT,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS id_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      file_path TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_documents_unit ON documents(unit_id);
    CREATE INDEX IF NOT EXISTS idx_slots_day ON timetable_slots(day);
  `);
  return db;
}

// ---------- Units ----------

export async function listUnits(): Promise<Unit[]> {
  const db = await getDb();
  return db.getAllAsync<Unit>('SELECT * FROM units ORDER BY code');
}

export async function addUnit(
  code: string,
  name: string,
  color = '#4F46E5',
  lecturer: string | null = null
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO units (code, name, color, lecturer) VALUES (?, ?, ?, ?)',
    code,
    name,
    color,
    lecturer
  );
  return result.lastInsertRowId;
}

export async function updateUnit(
  id: number,
  fields: Partial<Omit<Unit, 'id'>>
): Promise<void> {
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) return;
  const db = await getDb();
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k] ?? null);
  await db.runAsync(`UPDATE units SET ${setClause} WHERE id = ?`, ...values, id);
}

// Note: this removes the unit's DB rows (documents and slots cascade),
// but not the copied files on disk. File cleanup comes with document import.
export async function deleteUnit(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM units WHERE id = ?', id);
}
