import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Unit, addUnit, listUnits } from '../lib/db';
import { deleteUnitAndFiles } from '../lib/documents';

const COLORS = [
  '#4F46E5',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

export default function LockerHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const refresh = useCallback(async () => {
    setUnits(await listUnits());
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
    await addUnit(c, n, COLORS[units.length % COLORS.length]);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={styles.title}>My Locker</Text>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="Code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <TextInput
          style={[styles.input, styles.nameInput]}
          placeholder="Unit name"
          value={name}
          onChangeText={setName}
        />
        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={units}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Your locker is empty. Add your first unit above.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() => router.push(`/unit/${item.id}`)}
            onLongPress={() => confirmDelete(item)}
          >
            <Text style={styles.cardCode}>{item.code}</Text>
            <Text style={styles.cardName}>{item.name}</Text>
          </Pressable>
        )}
      />
      <Text style={styles.hint}>Tap a unit to open its shelf. Long-press to delete.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#F8FAFC' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16, color: '#0F172A' },
  form: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeInput: { width: 90 },
  nameInput: { flex: 1 },
  addButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 8,
    padding: 16,
    marginBottom: 10,
  },
  cardCode: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  cardName: { fontSize: 17, fontWeight: '600', color: '#0F172A', marginTop: 2 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 32 },
  hint: { textAlign: 'center', color: '#94A3B8', fontSize: 12, paddingVertical: 8 },
});
