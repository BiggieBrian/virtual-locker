import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sticker from '../components/Sticker';
import { exportBackup, restoreBackup } from '../lib/backup';
import { colors, fonts } from '../theme';

export default function BackupScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('Backup failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore from a backup?',
      'This replaces everything currently in your locker with the contents of the backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const r = await restoreBackup();
              if (r) {
                Alert.alert(
                  'Restored',
                  `${r.units} units, ${r.documents} documents and ${r.slots} classes are back.`
                );
              }
            } catch (e) {
              Alert.alert('Restore failed', String(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 28 }}
    >
      <Stack.Screen options={{ title: 'Backup' }} />

      <Text style={styles.heading}>Keep your locker safe</Text>
      <Text style={styles.body}>
        Your locker lives only on this phone. If you lose the phone or clear the
        app, it's gone. Save a backup file and keep it somewhere safe, like
        Google Drive or an email to yourself.
      </Text>

      <Sticker
        color={colors.mint}
        onPress={busy ? undefined : handleSave}
        style={styles.btn}
        faceStyle={styles.btnFace}
      >
        <Text style={styles.btnText}>Save backup</Text>
      </Sticker>

      <Sticker
        color={colors.sky}
        onPress={busy ? undefined : handleRestore}
        style={styles.btn}
        faceStyle={styles.btnFace}
      >
        <Text style={styles.btnText}>Restore from backup</Text>
      </Sticker>

      {busy && <Text style={styles.busy}>Working...</Text>}

      <Text style={styles.note}>
        The backup holds your units, timetable and document names. It does not
        hold the PDFs themselves, since they're big. After restoring on a new
        phone, tap a document and pick its PDF again to re-attach it. Your ID
        and timetable files need adding again too.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backdrop },
  heading: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink, marginBottom: 10 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color: colors.ink },
  btn: { marginTop: 20 },
  btnFace: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  busy: {
    fontFamily: fonts.semi,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 16,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginTop: 28,
  },
});
