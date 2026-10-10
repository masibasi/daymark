// Platform file I/O for backups: web uses a Blob download and a hidden file input; native uses expo-file-system, expo-sharing and expo-document-picker.
import { Platform } from 'react-native';

export const FILE_COPY = { shareTitle: 'Daymark' };

type Mime = 'application/json' | 'text/csv';

// Saves (web) or shares (native) a text file. Resolves when handed off.
export async function saveTextFile(filename: string, content: string, mime: Mime): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: FILE_COPY.shareTitle, UTI: mime === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' });
}

// Lets the person pick a .json file and returns its text; undefined when they cancel.
export async function pickJsonText(): Promise<string | undefined> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      let settled = false;
      const done = (action: () => void) => { if (settled) return; settled = true; input.remove(); action(); };
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) { done(() => resolve(undefined)); return; }
        file.text().then((text) => done(() => resolve(text)), (error: unknown) => done(() => reject(error)));
      });
      input.addEventListener('cancel', () => done(() => resolve(undefined)));
      document.body.appendChild(input);
      input.click();
    });
  }
  const { getDocumentAsync } = await import('expo-document-picker');
  const { File } = await import('expo-file-system');
  const result = await getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return undefined;
  return new File(result.assets[0].uri).text();
}
