import type { BodyImagery } from '../data/imagery';

export type ReachVisualMode = 'basic' | 'procedural' | 'enhanced';

interface HostAsset {
  assetId: string;
  destinationBodyId: string;
  url: string;
  sourceAttribution: string;
  width: number;
  height: number;
}

export interface ReachVisualAssets {
  mode: ReachVisualMode;
  assets: HostAsset[];
}

const BUNDLED: Record<string, { path: string; credit: string; width: number }> = {
  earth: { path: 'textures/reach-earth-bmng-2k.jpg', credit: 'NASA Earth Observatory / Blue Marble Next Generation', width: 2048 },
  moon: { path: 'textures/reach-moon-lroc-2k.jpg', credit: 'NASA SVS / LRO Camera / Arizona State University', width: 2048 },
  mars: { path: 'textures/reach-mars-viking.jpg', credit: 'NASA/JPL-Caltech/USGS / Viking', width: 1440 },
  phobos: { path: 'textures/reach-phobos-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Viking', width: 1440 },
  deimos: { path: 'textures/reach-deimos-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Viking', width: 1440 },
  io: { path: 'textures/reach-io-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager and Galileo', width: 1440 },
  europa: { path: 'textures/reach-europa-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
  ganymede: { path: 'textures/reach-ganymede-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
  callisto: { path: 'textures/reach-callisto-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
  mimas: { path: 'textures/reach-mimas-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
  enceladus: { path: 'textures/reach-enceladus-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
  tethys: { path: 'textures/reach-tethys-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
  dione: { path: 'textures/reach-dione-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
  rhea: { path: 'textures/reach-rhea-jpl.jpg', credit: 'NASA/JPL-Caltech/USGS / Voyager', width: 1440 },
};

export function readReachVisualAssets(): ReachVisualAssets {
  const host = (window as Window & { __reachVisualAssets?: unknown }).__reachVisualAssets;
  if (!host || typeof host !== 'object') return { mode: 'basic', assets: [] };
  const contract = host as { schema?: unknown; mode?: unknown; assets?: unknown };
  if (contract.schema !== 1) return { mode: 'basic', assets: [] };
  const mode = contract.mode === 'procedural' ? 'procedural'
    : contract.mode === 'enhanced' || contract.mode === 'cached' || contract.mode === 'download' ? 'enhanced' : 'basic';
  const assets = Array.isArray(contract.assets) ? contract.assets.filter((item): item is HostAsset => {
    if (!item || typeof item !== 'object') return false;
    const a = item as Partial<HostAsset>;
    return typeof a.assetId === 'string' && typeof a.destinationBodyId === 'string'
      && typeof a.url === 'string' && /^https:\/\/reach-assets\.example\/[a-zA-Z0-9_./-]+$/.test(a.url)
      && typeof a.sourceAttribution === 'string'
      && Number.isInteger(a.width) && Number.isInteger(a.height);
  }) : [];
  return { mode, assets };
}

export function selectReachAsset(bodyId: string, visuals: ReachVisualAssets, viewportPixels: number): HostAsset | undefined {
  if (visuals.mode !== 'enhanced') return undefined;
  const available = visuals.assets.filter(a => a.destinationBodyId === bodyId);
  const preferredWidth = viewportPixels > 2048 ? 4096 : 2048;
  return available.find(a => a.width === preferredWidth)
    ?? available.find(a => a.width === 4096)
    ?? available.find(a => a.width === 2048)
    ?? available[0];
}

export function reachImagery(bodyId: string, visuals: ReachVisualAssets): BodyImagery | undefined {
  if (visuals.mode === 'procedural') return undefined;
  const bundled = BUNDLED[bodyId];
  const enhanced = selectReachAsset(bodyId, visuals, window.innerWidth * window.devicePixelRatio);
  if (!bundled && !enhanced) return undefined;
  const local = bundled ? `${import.meta.env.BASE_URL}${bundled.path}` : undefined;
  const url = enhanced?.url ?? local!;
  return {
    day: { url: () => url, fallbackUrl: enhanced ? local : undefined,
      tileSize: enhanced?.width ?? bundled!.width, span0: 360, maxLevel: 0, fullMap: true },
    credit: enhanced?.sourceAttribution ?? bundled!.credit,
    hasOceanSpecular: bodyId === 'earth',
  };
}
