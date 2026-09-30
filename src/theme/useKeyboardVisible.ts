import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// True while a text input is focused (web) or the software keyboard is up (native).
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const isField = (target: EventTarget | null) => target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const onIn = (event: FocusEvent) => { if (isField(event.target)) { clearTimeout(timer); setVisible(true); } };
      const onOut = (event: FocusEvent) => { if (isField(event.target)) { clearTimeout(timer); timer = setTimeout(() => setVisible(false), 100); } };
      document.addEventListener('focusin', onIn);
      document.addEventListener('focusout', onOut);
      return () => { clearTimeout(timer); document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); };
    }
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return visible;
}
