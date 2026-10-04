import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sticker from '../../components/Sticker';
import { type DocType, type LockerDocument, type Unit } from '../../lib/db';
import {
  deleteDocument,
  getUnit,
  importPdf,
  listDocuments,
  uriForDocument,
} from '../../lib/documents';
import { openPdf } from '../../lib/openFile';
import { colors, fonts, stickerColor, tiltFor } from '../../theme';

const TYPES: { key: DocType; label: string; emoji: string; color: string }[] = [
  { key: 'outline', label: 'Outline', emoji: '📋', color: colors.sky },
  { key: 'textbook', label: 'Textbook', emoji: '📚', color: colors.sun },
  { key: 'notes', label: 'Notes', emoji: '📝', color: colors.mint },
  { key: 'other', label: 'Other', emoji: '📎', color: colors.bubblegum },
];

function typeInfo(type: DocType) {
  return TYPES.find((t) => t.key === type) ?? TYPES[3];
}

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
      await openPdf(uriForDocument(doc));
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

  const header = (
    <View>
      {unit && (
        <Sticker color={stickerColor(unit.id)} faceStyle={styles.bannerFace} style={styles.banner}>
          <Text style={styles.bannerCode}>{unit.code}</Text>
          <Text style={styles.bannerName}>{unit.name}</Text>
        </Sticker>
      )}

      <Text style={styles.label}>What are you adding?</Text>
      <View style={styles.chips}>
        {TYPES.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setType(t.key)}
            style={[styles.chip, type === t.key && { backgroundColor: t.color }]}
          >
            <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>
              {t.emoji} {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Sticker color={colors.tomato} onPress={handleImport} style={styles.addWrap} faceStyle={styles.addFace}>
        <Text style={styles.addText}>Add PDF</Text>
      </Sticker>

      <Text style={styles.shelfTitle}>On this shelf</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: unit ? unit.code : 'Unit' }} />
      <FlatList
        data={docs}
        keyExtractor={(d) => String(d.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 28 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            This shelf is empty. Pick a type above and add your first PDF.
          </Text>
        }
        ListFooterComponent={
          docs.length > 0 ? (
            <Text style={styles.hint}>Tap to open. Long-press to delete.</Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const info = typeInfo(item.type);
          return (
            <Sticker
              color={info.color}
              tilt={tiltFor(index)}
              style={styles.docWrap}
              faceStyle={styles.docFace}
              onPress={() => handleOpen(item)}
              onLongPress={() => confirmDelete(item)}
            >
              <Text style={styles.docType}>
                {info.emoji} {info.label}
              </Text>
              <Text style={styles.docTitle}>{item.title}</Text>
            </Sticker>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backdrop },
  banner: { marginBottom: 6 },
  bannerFace: { padding: 18 },
  bannerCode: { fontFamily: fonts.bold, fontSize: 32, color: colors.ink },
  bannerName: { fontFamily: fonts.medium, fontSize: 19, color: colors.ink },
  label: {
    fontFamily: fonts.semi,
    fontSize: 17,
    color: colors.ink,
    marginTop: 18,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  chipTextActive: { fontFamily: fonts.bold },
  addWrap: { marginTop: 20 },
  addFace: { paddingVertical: 14, alignItems: 'center' },
  addText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  shelfTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.ink,
    marginTop: 28,
    marginBottom: 12,
  },
  docWrap: { marginBottom: 12 },
  docFace: { paddingVertical: 12, paddingHorizontal: 16 },
  docType: { fontFamily: fonts.semi, fontSize: 14, color: colors.ink },
  docTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 2 },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.muted,
    marginTop: 8,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    paddingVertical: 12,
  },
});
