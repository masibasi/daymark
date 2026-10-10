import { Alert, Platform } from 'react-native';
import { t } from '@/i18n';

// Cross-platform confirm: window.confirm on web, Alert.alert with Cancel/Confirm on native.
export function confirmAction(title: string, message: string, confirmLabel = t().common.confirm): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: t().common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
