import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sticker from '../components/Sticker';
import TodayStrip from '../components/TodayStrip';
import { type IdCard, type Unit, addUnit, listUnits } from '../lib/db';
import {
  type DocumentHit,
  deleteUnitAndFiles,
  searchDocuments,
  uriForDocument,
} from '../lib/documents';
import {
  addIdCard,
  deleteIdCard,
  isPdf,
  listIdCards,
  uriForIdCard,
} from '../lib/idcards';
import { openPdf } from '../lib/openFile';
import { colors, fonts, stickerColor, tiltFor } from '../theme';

export default function LockerHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [idCards, setIdCards] = useState<IdCard[]>([]);
  const [viewing, setViewing] = useState<IdCard | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<DocumentHit[]>([]);
  const searching = query.trim() !== '';

  useEffect(() => {
    if (query.trim() === '') {
      setHits([]);
      return;
    }
    searchDocuments(query).then(setHits).catch(console.error);
  }, [query]);

  const hasId = idCards.some((c) => c.label === 'School ID');
  const hasTimetable = idCards.some((c) => c.label === 'Timetable');

  const refresh = useCallback(async () => {
    setUnits(await listUnits());
    setIdCards(await listIdCards());
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const handleAdd = async () => {
    const c = code.trim();
    const n = name.trim();
    if (!c || !n) {
      Alert.alert('Missing info', 'Enter both a unit code and a name.');
      return;
    }
    await addUnit(c, n);
    setCode('');
    setName('');
    await refresh();
  };

  const confirmDelete = (unit: Unit) => {
    Alert.alert(
      'Delete unit?',
      `${unit.code} and all its documents will be removed from the locker.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUnitAndFiles(unit.id);
            await refresh();
          },
        },
      ]
    );
  };

  const handleAddId = async (label: string) => {
    try {
      const card = await addIdCard(label);
      if (card) await refresh();
    } catch (e) {
      Alert.alert('Could not add file', String(e));
    }
  };

  const handleOpenId = async (card: IdCard) => {
    if (!isPdf(card)) {
      setViewing(card);
      return;
    }
    try {
      await openPdf(uriForIdCard(card));
    } catch (e) {
      Alert.alert('Could not open file', String(e));
    }
  };

  const confirmDeleteId = (card: IdCard) => {
    Alert.alert('Remove from locker?', card.label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteIdCard(card);
          await refresh();
        },
      },
    ]);
  };

  const openHit = async (doc: DocumentHit) => {
    try {
      await openPdf(uriForDocument(doc));
    } catch (e) {
      Alert.alert('Could not open file', String(e));
    }
  };

  const header = (
    <View>
      <Text style={styles.title}>My Locker</Text>

      <TextInput
        style={styles.search}
        placeholder="Search your files"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {searching && (
        <View>
          {hits.length === 0 ? (
            <Text style={styles.empty}>
              Nothing found. Try part of a file name or a unit code.
            </Text>
          ) : (
            hits.map((h, i) => (
              <Sticker
                key={h.id}
                color={stickerColor(h.unit_id)}
                tilt={tiltFor(i)}
                style={styles.unit}
                faceStyle={styles.hitFace}
                onPress={() => openHit(h)}
              >
                <Text style={styles.hitUnit}>{h.unit_code}</Text>
                <Text style={styles.hitTitle}>{h.title}</Text>
              </Sticker>
            ))
          )}
        </View>
      )}

      {!searching && (
        <>
      <View style={styles.idRow}>
        {idCards.map((card) => (
          <Sticker
            key={card.id}
            color={card.label === 'Timetable' ? colors.bubblegum : colors.sun}
            faceStyle={styles.chipFace}
            onPress={() => handleOpenId(card)}
            onLongPress={() => confirmDeleteId(card)}
          >
            <Text style={styles.chipText}>
              {card.label === 'Timetable' ? '🗓️' : '🪪'} {card.label}
            </Text>
          </Sticker>
        ))}
        {!hasTimetable && (
          <Pressable style={styles.addChip} onPress={() => handleAddId('Timetable')}>
            <Text style={styles.addChipText}>+ Add Timetable</Text>
          </Pressable>
        )}
        {!hasId && (
          <Pressable style={styles.addChip} onPress={() => handleAddId('School ID')}>
            <Text style={styles.addChipText}>+ Add ID</Text>
          </Pressable>
        )}
      </View>

      <TodayStrip />

      <View style={styles.form}>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="Code"
          placeholderTextColor={colors.muted}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <TextInput
          style={[styles.input, styles.nameInput]}
          placeholder="Unit name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />
        <Sticker color={colors.tomato} onPress={handleAdd} faceStyle={styles.addFace}>
          <Text style={styles.addText}>Add</Text>
        </Sticker>
      </View>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={searching ? [] : units}
        keyExtractor={(u) => String(u.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          searching ? null : (
            <Text style={styles.empty}>
              Your locker is empty. Add your first unit above.
            </Text>
          )
        }
        ListFooterComponent={
          units.length > 0 ? (
            <Text style={styles.hint}>
              Tap to open. Long-press a unit or file to delete it.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Sticker
            color={stickerColor(item.id)}
            tilt={tiltFor(index)}
            style={styles.unit}
            faceStyle={styles.unitFace}
            onPress={() => router.push(`/unit/${item.id}`)}
            onLongPress={() => confirmDelete(item)}
          >
            <Text style={styles.unitCode}>{item.code}</Text>
            <Text style={styles.unitName}>{item.name}</Text>
          </Sticker>
        )}
      />

      <Modal
        visible={viewing !== null}
        animationType="fade"
        onRequestClose={() => setViewing(null)}
      >
        <View style={styles.viewer}>
          {viewing && (
            <Image
              source={{ uri: uriForIdCard(viewing) }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={[styles.closeButton, { top: insets.top + 12 }]}
            onPress={() => setViewing(null)}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, backgroundColor: colors.backdrop },
  title: {
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 46,
    color: colors.ink,
    marginBottom: 14,
  },
  idRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chipFace: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.semi, fontSize: 15, color: colors.ink },
  addChip: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  addChipText: { fontFamily: fonts.semi, fontSize: 15, color: colors.ink },
  form: { flexDirection: 'row', gap: 8, marginBottom: 20 },
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
    alignSelf: 'flex-start',
  },
  codeInput: { width: 92 },
  nameInput: { flex: 1 },
  addFace: { paddingHorizontal: 18, paddingVertical: 10, justifyContent: 'center' },
  addText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  unit: { marginBottom: 12 },
  search: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 18,
  },
  hitFace: { paddingVertical: 12, paddingHorizontal: 16 },
  hitUnit: { fontFamily: fonts.semi, fontSize: 14, color: colors.ink },
  hitTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 2 },
  unitFace: { padding: 18 },
  unitCode: { fontFamily: fonts.bold, fontSize: 26, color: colors.ink },
  unitName: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.muted,
    marginTop: 24,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    paddingVertical: 12,
  },
  viewer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  closeButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeText: { fontFamily: fonts.semi, color: '#FFFFFF' },
});
