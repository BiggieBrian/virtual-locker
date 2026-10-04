import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { type IdCard, getDb } from './db';

const ID_DIR = `${FileSystem.documentDirectory}id-cards/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(ID_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ID_DIR, { intermediates: true });
  }
}

export function uriForIdCard(card: IdCard): string {
  return `${ID_DIR}${card.file_path}`;
}

export function isPdf(card: IdCard): boolean {
  return card.file_path.toLowerCase().endsWith('.pdf');
}

export async function listIdCards(): Promise<IdCard[]> {
  const db = await getDb();
  return db.getAllAsync<IdCard>('SELECT * FROM id_cards ORDER BY id');
}

export async function addIdCard(label: string): Promise<IdCard | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const safeName = asset.name.replace(/[^\w.\-]+/g, '_');
  const storedName = `${Date.now()}_${safeName}`;

  await ensureDir();
  await FileSystem.copyAsync({ from: asset.uri, to: `${ID_DIR}${storedName}` });

  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO id_cards (label, file_path) VALUES (?, ?)',
    label,
    storedName
  );
  return { id: res.lastInsertRowId, label, file_path: storedName };
}

export async function deleteIdCard(card: IdCard): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM id_cards WHERE id = ?', card.id);
  await FileSystem.deleteAsync(uriForIdCard(card), { idempotent: true });
}
