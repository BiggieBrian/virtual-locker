import { Alert } from 'react-native';
import { type LockerDocument } from './db';
import { documentFileExists, reattachPdf, uriForDocument } from './documents';
import { openPdf } from './openFile';

// Opens a document. If its PDF is missing (for example after restoring a
// backup on a new phone), offers to re-attach it instead of failing.
export async function openDocument(
  doc: LockerDocument,
  onChanged?: () => void
): Promise<void> {
  try {
    if (await documentFileExists(doc)) {
      await openPdf(uriForDocument(doc));
      return;
    }
    Alert.alert(
      'PDF not on this phone',
      `"${doc.title}" was restored without its PDF. Pick the file again to re-attach it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pick file',
          onPress: async () => {
            try {
              if (await reattachPdf(doc)) onChanged?.();
            } catch (e) {
              Alert.alert('Could not re-attach', String(e));
            }
          },
        },
      ]
    );
  } catch (e) {
    Alert.alert('Could not open file', String(e));
  }
}
