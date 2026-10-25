/**
 * A random id of `bytes` bytes, as hex. It works outside a secure context,
 * where `crypto.randomUUID` is missing.
 */
export function randomId(bytes = 12): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('')
}
