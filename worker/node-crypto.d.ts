// The one part of `node:crypto` that the Worker uses, through the
// `nodejs_compat` flag. Declared here so that the Worker program does not
// need the full Node types.
declare module 'node:crypto' {
  interface Hash {
    update(data: string): Hash
    digest(encoding: 'hex'): string
  }
  export function createHash(algorithm: 'sha256'): Hash
}
