import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sticker from '../../components/Sticker';
import { type DocType, type LockerDocument, type Unit, listUnits } from '../../lib/db';
import {
  deleteDocument,
  getUnit,
  importPdf,
  listDocuments,
  moveDocument,
  renameDocument,
  uriForDocument,
} from '../../lib/documents';
import { openDocument } from '../../lib/openDocument';
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

type SheetMode = 'menu' | 'rename' | 'move';

export default function UnitShelf() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unitId = Number(id);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [docs, setDocs] = useState<LockerDocument[]>([]);
  const [type, setType] = useState<DocType>('outline');

  const [selected, setSelected] = useState<LockerDocument | null>(null);
  const [mode, setMode] = useState<SheetMode>('menu');
  const [titleDraft, setTitleDraft] = useState('');
  const [targetUnit, setTargetUnit] = useState<number>(unitId);
  const [targetType, setTargetType] = useState<DocType>('outline');

  const refresh = useCallback(async () => {
    setUnit(await getUnit(unitId));
    setAllUnits(await listUnits());
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

  const handleOpen = (doc: LockerDocument) =>
    openDocument(doc, () => {
      refresh().catch(console.error);
    });

  const openSheet = (doc: LockerDocument) => {
    setSelected(doc);
    setMode('menu');
    setTitleDraft(doc.title);
    setTargetUnit(doc.unit_id);
    setTargetType(doc.type);
  };

  const closeSheet = () => setSelected(null);

  const saveRename = async () => {
    const t = titleDraft.trim();
    if (!selected) return;
    if (t === '') {
      Alert.alert('Name needed', 'Type a name for this document.');
      return;
    }
    await renameDocument(selected.id, t);
    closeSheet();
    await refresh();
  };

  const saveMove = async () => {
    if (!selected) return;
    await moveDocument(selected.id, targetUnit, targetType);
    closeSheet();
    await refresh();
  };

  const confirmDelete = () => {
    if (!selected) return;
    const doc = selected;
    closeSheet();
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
            <Text style={styles.hint}>Tap to open. Long-press for options.</Text>
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
              onLongPress={() => openSheet(item)}
            >
              <Text style={styles.docType}>
                {info.emoji} {info.label}
              </Text>
              <Text style={styles.docTitle}>{item.title}</Text>
            </Sticker>
          );
        }}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <Pressable
          style={[styles.overlay, { paddingTop: insets.top + 70 }]}
          onPress={closeSheet}
        >
          <Sticker color={colors.white} faceStyle={styles.sheetFace} style={styles.sheet}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {selected?.title}
            </Text>

            {mode === 'menu' && (
              <View style={styles.sheetBody}>
                <Sticker color={colors.sun} onPress={() => setMode('rename')} faceStyle={styles.optFace}>
                  <Text style={styles.optText}>Rename</Text>
                </Sticker>
                <Sticker color={colors.sky} onPress={() => setMode('move')} faceStyle={styles.optFace}>
                  <Text style={styles.optText}>Move to another unit or type</Text>
                </Sticker>
                <Sticker color={colors.tomato} onPress={confirmDelete} faceStyle={styles.optFace}>
                  <Text style={styles.optText}>Delete</Text>
                </Sticker>
                <Pressable onPress={closeSheet}>
                  <Text style={styles.closeLink}>Close</Text>
                </Pressable>
              </View>
            )}

            {mode === 'rename' && (
              <View style={styles.sheetBody}>
                <TextInput
                  style={styles.input}
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  placeholder="Document name"
                  placeholderTextColor={colors.muted}
                  autoFocus
                />
                <Sticker color={colors.mint} onPress={saveRename} faceStyle={styles.optFace}>
                  <Text style={styles.optText}>Save name</Text>
                </Sticker>
                <Pressable onPress={() => setMode('menu')}>
                  <Text style={styles.closeLink}>Back</Text>
                </Pressable>
              </View>
            )}

            {mode === 'move' && (
              <View style={styles.sheetBody}>
                <Text style={styles.sheetLabel}>Which unit?</Text>
                <View style={styles.chips}>
                  {allUnits.map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => setTargetUnit(u.id)}
                      style={[
                        styles.chip,
                        targetUnit === u.id && { backgroundColor: stickerColor(u.id) },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, targetUnit === u.id && styles.chipTextActive]}
                      >
                        {u.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.sheetLabel}>Which type?</Text>
                <View style={styles.chips}>
                  {TYPES.map((t) => (
                    <Pressable
                      key={t.key}
                      onPress={() => setTargetType(t.key)}
                      style={[styles.chip, targetType === t.key && { backgroundColor: t.color }]}
                    >
                      <Text
                        style={[styles.chipText, targetType === t.key && styles.chipTextActive]}
                      >
                        {t.emoji} {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Sticker color={colors.mint} onPress={saveMove} faceStyle={styles.optFace}>
                  <Text style={styles.optText}>Move here</Text>
                </Sticker>
                <Pressable onPress={() => setMode('menu')}>
                  <Text style={styles.closeLink}>Back</Text>
                </Pressable>
              </View>
            )}
          </Sticker>
        </Pressable>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,19,64,0.55)',
    paddingHorizontal: 20,
  },
  sheet: { alignSelf: 'stretch' },
  sheetFace: { padding: 18 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  sheetBody: { marginTop: 14, gap: 12 },
  sheetLabel: { fontFamily: fonts.semi, fontSize: 15, color: colors.ink },
  optFace: { paddingVertical: 12, paddingHorizontal: 16 },
  optText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  closeLink: {
    fontFamily: fonts.semi,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
  },
});
