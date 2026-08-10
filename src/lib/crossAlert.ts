// src/lib/crossAlert.ts
//
// React Native's Alert.alert() is a silent no-op on web -- no popup, no
// console warning, nothing. Every error message and confirmation dialog
// in this app (log out, close job, sign-in failures, etc.) went through
// it, which meant every single one of them was invisibly broken on web:
// the underlying action would fail exactly as it should, but the person
// using the app would see nothing happen at all and have no idea why.
//
// This is a drop-in replacement -- same shape as RN's Alert (an object
// with an `.alert()` method, same signature), so every existing call
// site (Alert.alert('Title', 'message', [...buttons])) keeps working
// completely unchanged. Only the import line changes per file:
//   import { CrossAlert as Alert } from '../src/lib/crossAlert';
// instead of importing Alert from 'react-native'.
import { Platform, Alert as RNAlert } from 'react-native';

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

interface AlertButton {
  text?: string;
  onPress?: (value?: string) => void;
  style?: AlertButtonStyle;
}

function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const combined = [title, message].filter(Boolean).join('\n\n');

  // No buttons, or just one (the common case -- error messages,
  // "Coming Soon" notices, success confirmations): a plain alert is the
  // right web equivalent. Still fires the button's onPress afterward if
  // one was provided, so callers relying on that callback firing (rare,
  // but exists) don't silently break.
  if (!buttons || buttons.length <= 1) {
    window.alert(combined);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Two buttons (every real confirmation dialog in this app -- Log Out,
  // Close Job, Switch Role -- uses exactly this shape: a 'cancel'-style
  // button plus one action button). window.confirm() only offers a
  // binary OK/Cancel choice with no custom button labels, so it can't
  // perfectly reproduce e.g. "Keep Open" vs "Close Job" as distinct
  // button text -- but it correctly preserves which callback fires,
  // which is what actually matters functionally.
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

  const confirmed = window.confirm(combined);
  if (confirmed) {
    actionButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}

export const CrossAlert = { alert };
