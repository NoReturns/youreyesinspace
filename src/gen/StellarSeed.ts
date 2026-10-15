/** Stable surface identity. Bound uSeed * 3 below 53k for float32 shader noise offsets. */
export function stellarSurfaceSeed(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193) >>> 0;
  }
  hash = Math.imul(hash ^ 742, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 16;
  return 1024 + (hash >>> 0) % 16384;
}
