/** A number from 0 up to but not including 1, from the secure source. */
export function random(): number {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
  return value / 2 ** 32
}
