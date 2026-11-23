/** Short vibration on supported phones (Android Chrome). Silently does nothing elsewhere. */
export function haptic(pattern: number | number[] = 8) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
