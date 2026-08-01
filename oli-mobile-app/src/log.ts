export function debugLog(...args: unknown[]): void {
  if (__DEV__) console.log('[oli-scanner]', ...args);
}

export function debugWarn(...args: unknown[]): void {
  if (__DEV__) console.warn('[oli-scanner]', ...args);
}
