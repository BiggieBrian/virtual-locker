import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type DocType, type LockerDocument, type Unit } from '../../lib/db';
import {
  deleteDocument,
  uriForDocument,
  getUnit,
  importPdf,
  listDocuments,
} from '../../lib/documents';

const TYPES: { key: DocType; label: string }[] = [
  { key: 'outline', label: 'Outline' },
  { key: 'textbook', label: 'Textbook' },
  { key: 'notes', label: 'Notes' },
  { key: 'other', label: 'Other' },
];

export default function UnitShelf() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unitId = Number(id);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [docs, setDocs] = useState<LockerDocument[]>([]);
  const [type, setType] = useState<DocType>('outline');

  const refresh = useCallback(async () => {
    setUnit(await getUnit(unitId));
    setDocs(await listDocuments(unitId));
  }, [unitId]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const handleImport = async () => {
    try {
      const doc = await importPdf(unitId, type);
      if (doc) await refresh();
    } catch (e) {
      Alert.alert('Import failed', String(e));
    }
  };

  const handleOpen = async (doc: LockerDocument) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Cannot open', 'No app available to open PDFs on this device.');
        return;
      }
      await Sharing.shareAsync(uriForDocument(doc), {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: doc.title,
      });
    } catch (e) {
      Alert.alert('Could not open file', String(e));
    }
  };

  const confirmDelete = (doc: LockerDocument) => {
    Alert.alert('Delete document?', doc.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDocument(doc);
          await refresh();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <Stack.Screen options={{ title: unit ? unit.code : 'Unit' }} />
      <Text style={styles.unitName}>{unit?.name ?? ''}</Text>

      <Text style={styles.label}>Next import is a:</Text>
      <View style={styles.chips}>
        {TYPES.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setType(t.key)}
            style={[styles.chip, type === t.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.importButton} onPress={handleImport}>
        <Text style={styles.importText}>+ Add PDF</Text>
      </Pressable>

      <FlatList
        data={docs}
        keyExtractor={(d) => String(d.id)}
        ListEmptyComponent={<Text style={styles.empty}>No documents on this shelf yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.docCard}
            onPress={() => handleOpen(item)}
            onLongPress={() => confirmDelete(item)}
          >
            <Text style={styles.docType}>{item.type.toUpperCase()}</Text>
            <Text style={styles.docTitle}>{item.title}</Text>
          </Pressable>
        )}
      />
      <Text style={styles.hint}>Tap to open. Long-press to delete.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  unitName: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText: { color: '#334155' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  importButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  importText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  docType: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  docTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginTop: 2 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 24 },
  hint: { textAlign: 'center', color: '#94A3B8', fontSize: 12, paddingVertical: 8 },
});
