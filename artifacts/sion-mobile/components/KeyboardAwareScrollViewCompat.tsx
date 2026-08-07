/**
 * Thin wrapper that was previously backed by react-native-keyboard-controller.
 * That native module crashed on Android, so this now uses the built-in
 * ScrollView on all platforms. It is kept as a component so call sites don't
 * need to change.
 */
import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

type Props = ScrollViewProps & { children?: React.ReactNode };

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  ...props
}: Props) {
  return (
    <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
      {children}
    </ScrollView>
  );
}
