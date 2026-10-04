import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

// Android: open the PDF straight in the phone's PDF viewer.
// iOS: fall back to the share sheet preview.
export async function openPdf(uri: string): Promise<void> {
  if (Platform.OS === 'android') {
    const contentUri = await FileSystem.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1,
      type: 'application/pdf',
    });
    return;
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}
