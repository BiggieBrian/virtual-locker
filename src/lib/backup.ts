import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  type IdCard,
  type LockerDocument,
  type TimetableSlot,
  type Unit,
  getDb,
} from './db';

interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  units: Unit[];
  documents: LockerDocument[];
  timetable_slots: TimetableSlot[];
  id_cards: IdCard[];
}

export interface RestoreSummary {
  units: number;
  documents: number;
  slots: number;
}

function isBackup(x: unknown): x is BackupFile {
  const d = x as Partial<BackupFile> | null;
  return (
    !!d &&
    d.app === 'virtual-locker' &&
    Array.isArray(d.units) &&
    Array.isArray(d.documents) &&
    Array.isArray(d.timetable_slots) &&
    Array.isArray(d.id_cards)
  );
}

// Saves units, documents (names only), timetable and ID entries as one JSON
// file and opens the share sheet so it can be saved to Drive, email, etc.
export async function exportBackup(): Promise<void> {
  const db = await getDb();
  const data: BackupFile = {
    app: 'virtual-locker',
    version: 1,
    exportedAt: new Date().toISOString(),
    units: await db.getAllAsync<Unit>('SELECT * FROM units'),
    documents: await db.getAllAsync<LockerDocument>('SELECT * FROM documents'),
    timetable_slots: await db.getAllAsync<TimetableSlot>('SELECT * FROM timetable_slots'),
    id_cards: await db.getAllAsync<IdCard>('SELECT * FROM id_cards'),
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}locker-backup-${stamp}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(data));
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save your locker backup',
  });
}

// Replaces everything in the locker with the contents of a backup file.
export async function restoreBackup(): Promise<RestoreSummary | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: false,
  });
  if (picked.canceled || picked.assets.length === 0) return null;

  const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not a Virtual Locker backup.');
  }
  if (!isBackup(parsed)) {
    throw new Error('That file is not a Virtual Locker backup.');
  }
  const data = parsed;

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM units'); // cascades to documents and timetable slots
    await db.runAsync('DELETE FROM id_cards');

    for (const u of data.units) {
      await db.runAsync(
        'INSERT INTO units (id, code, name, color, lecturer) VALUES (?, ?, ?, ?, ?)',
        u.id,
        u.code,
        u.name,
        u.color,
        u.lecturer ?? null
      );
    }
    for (const d of data.documents) {
      await db.runAsync(
        'INSERT INTO documents (id, unit_id, type, title, file_path, added_at) VALUES (?, ?, ?, ?, ?, ?)',
        d.id,
        d.unit_id,
        d.type,
        d.title,
        d.file_path,
        d.added_at
      );
    }
    for (const s of data.timetable_slots) {
      await db.runAsync(
        'INSERT INTO timetable_slots (id, unit_id, day, start, "end", venue) VALUES (?, ?, ?, ?, ?, ?)',
        s.id,
        s.unit_id,
        s.day,
        s.start,
        s.end,
        s.venue ?? null
      );
    }
    for (const c of data.id_cards) {
      await db.runAsync(
        'INSERT INTO id_cards (id, label, file_path) VALUES (?, ?, ?)',
        c.id,
        c.label,
        c.file_path
      );
    }
  });

  return {
    units: data.units.length,
    documents: data.documents.length,
    slots: data.timetable_slots.length,
  };
}
