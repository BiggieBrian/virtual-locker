import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sticker from '../components/Sticker';
import { type Unit, listUnits } from '../lib/db';
import {
  DAY_NAMES,
  type SlotWithUnit,
  addSlot,
  deleteSlot,
  formatHour,
  listSlots,
  todayIndex,
} from '../lib/timetable';
import { colors, fonts, stickerColor, tiltFor } from '../theme';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const DURATIONS = [1, 2, 3, 4];

function Chip(props: {
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.chip, props.active && { backgroundColor: props.activeColor }]}
    >
      <Text style={[styles.chipText, props.active && styles.chipTextActive]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

export default function TimetableScreen() {
  const insets = useSafeAreaInsets();
  const [units, setUnits] = useState<Unit[]>([]);
  const [slots, setSlots] = useState<SlotWithUnit[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [day, setDay] = useState(todayIndex());
  const [startHour, setStartHour] = useState(8);
  const [duration, setDuration] = useState(2);
  const [venue, setVenue] = useState('');

  const refresh = useCallback(async () => {
    const list = await listUnits();
    setUnits(list);
    setUnitId((prev) => prev ?? list[0]?.id ?? null);
    setSlots(await listSlots());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(console.error);
    }, [refresh])
  );

  const handleAdd = async () => {
    if (unitId === null) {
      Alert.alert('Pick a unit', 'Choose which unit this class is for.');
      return;
    }
    await addSlot(unitId, day, startHour, duration, venue);
    setVenue('');
    await refresh();
  };

  const confirmDelete = (s: SlotWithUnit) => {
    Alert.alert('Delete class?', `${s.unit_code}, ${s.start} to ${s.end}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSlot(s.id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 28 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Timetable' }} />

      <Text style={styles.label}>Which unit?</Text>
      {units.length === 0 ? (
        <Text style={styles.note}>Add a unit on the home screen first.</Text>
      ) : (
        <View style={styles.chips}>
          {units.map((u) => (
            <Chip
              key={u.id}
              label={u.code}
              active={unitId === u.id}
              activeColor={stickerColor(u.id)}
              onPress={() => setUnitId(u.id)}
            />
          ))}
        </View>
      )}

      <Text style={styles.label}>Which day?</Text>
      <View style={styles.chips}>
        {DAY_NAMES.map((n, i) => (
          <Chip
            key={n}
            label={n.slice(0, 3)}
            active={day === i + 1}
            activeColor={colors.sky}
            onPress={() => setDay(i + 1)}
          />
        ))}
      </View>

      <Text style={styles.label}>Starts at</Text>
      <View style={styles.chips}>
        {HOURS.map((h) => (
          <Chip
            key={h}
            label={formatHour(h)}
            active={startHour === h}
            activeColor={colors.sun}
            onPress={() => setStartHour(h)}
          />
        ))}
      </View>

      <Text style={styles.label}>How long?</Text>
      <View style={styles.chips}>
        {DURATIONS.map((d) => (
          <Chip
            key={d}
            label={`${d} hr`}
            active={duration === d}
            activeColor={colors.mint}
            onPress={() => setDuration(d)}
          />
        ))}
      </View>

      <Text style={styles.label}>Where? (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. LT 3"
        placeholderTextColor={colors.muted}
        value={venue}
        onChangeText={setVenue}
      />

      <Sticker color={colors.tomato} onPress={handleAdd} style={styles.addWrap} faceStyle={styles.addFace}>
        <Text style={styles.addText}>Add class</Text>
      </Sticker>

      <Text style={styles.sectionTitle}>Your week</Text>
      {slots.length === 0 ? (
        <Text style={styles.note}>No classes yet. Add your first one above.</Text>
      ) : (
        DAY_NAMES.map((n, i) => {
          const daySlots = slots.filter((s) => s.day === i + 1);
          if (daySlots.length === 0) return null;
          return (
            <View key={n} style={styles.dayBlock}>
              <Text style={styles.dayHeading}>{n}</Text>
              {daySlots.map((s, idx) => (
                <Sticker
                  key={s.id}
                  color={stickerColor(s.unit_id)}
                  tilt={tiltFor(i + idx)}
                  style={styles.rowWrap}
                  faceStyle={styles.rowFace}
                  onLongPress={() => confirmDelete(s)}
                >
                  <Text style={styles.rowTime}>
                    {s.start} to {s.end}
                  </Text>
                  <Text style={styles.rowCode}>{s.unit_code}</Text>
                  {s.venue ? <Text style={styles.rowVenue}>{s.venue}</Text> : null}
                </Sticker>
              ))}
            </View>
          );
        })
      )}
      {slots.length > 0 && <Text style={styles.hint}>Long-press a class to delete it.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backdrop },
  label: {
    fontFamily: fonts.semi,
    fontSize: 17,
    color: colors.ink,
    marginTop: 18,
    marginBottom: 8,
  },
  note: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
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
  addWrap: { marginTop: 22 },
  addFace: { paddingVertical: 14, alignItems: 'center' },
  addText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.ink,
    marginTop: 32,
    marginBottom: 10,
  },
  dayBlock: { marginBottom: 14 },
  dayHeading: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 8,
  },
  rowWrap: { marginBottom: 8 },
  rowFace: { paddingVertical: 10, paddingHorizontal: 14 },
  rowTime: { fontFamily: fonts.semi, fontSize: 14, color: colors.ink },
  rowCode: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  rowVenue: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    paddingTop: 8,
  },
});
