import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { type DocType, type LockerDocument, type Unit, deleteUnit, getDb } from './db';

// Files live in the app's own folder. The DB stores only the stored file
// name (file_path column), so paths stay valid if the app container moves.
const DOCS_DIR = `${FileSystem.documentDirectory}locker-docs/`;

async function ensureDocsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOCS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true });
  }
}

export function uriForDocument(doc: LockerDocument): string {
  return `${DOCS_DIR}${doc.file_path}`;
}

async function removeStoredFile(name: string): Promise<void> {
  await FileSystem.deleteAsync(`${DOCS_DIR}${name}`, { idempotent: true });
}

export async function getUnit(id: number): Promise<Unit | null> {
  const db = await getDb();
  return db.getFirstAsync<Unit>('SELECT * FROM units WHERE id = ?', id);
}

export async function listDocuments(unitId: number): Promise<LockerDocument[]> {
  const db = await getDb();
  return db.getAllAsync<LockerDocument>(
    'SELECT * FROM documents WHERE unit_id = ? ORDER BY added_at DESC',
    unitId
  );
}

export async function importPdf(
  unitId: number,
  type: DocType
): Promise<LockerDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const safeName = asset.name.replace(/[^\w.\-]+/g, '_');
  const storedName = `${Date.now()}_${safeName}`;

  await ensureDocsDir();
  await FileSystem.copyAsync({ from: asset.uri, to: `${DOCS_DIR}${storedName}` });

  const title = asset.name.replace(/\.pdf$/i, '');
  const addedAt = Date.now();
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO documents (unit_id, type, title, file_path, added_at) VALUES (?, ?, ?, ?, ?)',
    unitId,
    type,
    title,
    storedName,
    addedAt
  );
  return {
    id: res.lastInsertRowId,
    unit_id: unitId,
    type,
    title,
    file_path: storedName,
    added_at: addedAt,
  };
}

export async function deleteDocument(doc: LockerDocument): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM documents WHERE id = ?', doc.id);
  await removeStoredFile(doc.file_path);
}

// Deletes the unit (DB rows cascade) and the PDF files copied for it.
export async function deleteUnitAndFiles(unitId: number): Promise<void> {
  const docs = await listDocuments(unitId);
  await deleteUnit(unitId);
  await Promise.all(docs.map((d) => removeStoredFile(d.file_path)));
}

export interface DocumentHit extends LockerDocument {
  unit_code: string;
  unit_name: string;
}

// Finds documents by file name, or by their unit's code or name.
export async function searchDocuments(query: string): Promise<DocumentHit[]> {
  const q = query.trim();
  if (q === '') return [];
  const db = await getDb();
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db.getAllAsync<DocumentHit>(
    `SELECT d.*, u.code AS unit_code, u.name AS unit_name
     FROM documents d JOIN units u ON u.id = d.unit_id
     WHERE d.title LIKE ? ESCAPE '\\'
        OR u.code LIKE ? ESCAPE '\\'
        OR u.name LIKE ? ESCAPE '\\'
     ORDER BY d.added_at DESC`,
    like,
    like,
    like
  );
}
