import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { DAY_NAMES, type SlotWithUnit, listSlots, todayIndex } from '../lib/timetable';
import { colors, fonts, stickerColor, tiltFor } from '../theme';
import Sticker from './Sticker';

export default function TodayStrip() {
  const router = useRouter();
  const [slots, setSlots] = useState<SlotWithUnit[]>([]);
  const dayName = DAY_NAMES[todayIndex() - 1];

  useFocusEffect(
    useCallback(() => {
      listSlots(todayIndex()).then(setSlots).catch(console.error);
    }, [])
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.heading}>Today is {dayName}</Text>
        <Pressable onPress={() => router.push('/timetable')}>
          <Text style={styles.edit}>Edit timetable</Text>
        </Pressable>
      </View>

      {slots.length === 0 ? (
        <Text style={styles.none}>No classes today.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {slots.map((s, i) => (
            <Sticker
              key={s.id}
              color={stickerColor(s.unit_id)}
              tilt={tiltFor(i)}
              faceStyle={styles.slotFace}
              style={styles.slot}
            >
              <Text style={styles.time}>
                {s.start} to {s.end}
              </Text>
              <Text style={styles.code}>{s.unit_code}</Text>
              {s.venue ? <Text style={styles.venue}>{s.venue}</Text> : null}
            </Sticker>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  edit: {
    fontFamily: fonts.semi,
    fontSize: 14,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  none: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  scroll: { paddingVertical: 4, paddingRight: 8 },
  slot: { marginRight: 10 },
  slotFace: { paddingVertical: 10, paddingHorizontal: 14, minWidth: 120 },
  time: { fontFamily: fonts.semi, fontSize: 13, color: colors.ink },
  code: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  venue: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
