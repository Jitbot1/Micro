import { PaintJobId, StickerId, VehicleType, WorldType } from './types';

export interface PaintJobOption {
  id: PaintJobId;
  name: string;
  primaryHex: number;
  secondaryHex: number;
  stripeHex: number;
  bandHex: number;
  primaryCss: string;
  secondaryCss: string;
  stripeCss: string;
  bandCss: string;
  textCss: string;
}

export interface StickerOption {
  id: StickerId;
  name: string;
  shortLabel: string;
  tagline: string;
  accentCss: string;
}

export interface VehicleOption {
  id: VehicleType;
  name: string;
  shortName: string;
  subtitle: string;
}

export interface WorldOption {
  id: WorldType;
  name: string;
  shortName: string;
  subtitle: string;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: 'micro',
    name: 'Micro Línea 18',
    shortName: 'Micro Bus',
    subtitle: 'Bus stops & commuter quota',
  },
  {
    id: 'flota',
    name: 'Flota Exótica',
    shortName: 'Tour Coach',
    subtitle: '6-wheel coach & missions',
  },
  {
    id: 'taxi',
    name: 'Radio Taxi',
    shortName: 'Speed Taxi',
    subtitle: 'Timed destination rush',
  },
  {
    id: 'jungleJeep',
    name: 'Expedition 4x4',
    shortName: 'Armed Jeep',
    subtitle: 'Roof machine gun [F]',
  },
];

export const WORLD_OPTIONS: WorldOption[] = [
  {
    id: 'city',
    name: 'Santa Cruz City',
    shortName: 'City',
    subtitle: 'Two-way avenues & markets',
  },
  {
    id: 'mountain',
    name: 'Yungas Mountains',
    shortName: 'Mountains',
    subtitle: 'Dirt roads, cliffs & canyons',
  },
  {
    id: 'jungle',
    name: 'Amazonia Jungle',
    shortName: 'Jungle',
    subtitle: 'Mud trails, raiders & ruins',
  },
];

export const PAINT_JOBS: PaintJobOption[] = [
  {
    id: 'camba',
    name: 'Camba Emerald',
    primaryHex: 0x059669,
    secondaryHex: 0xfef3c7,
    stripeHex: 0xdc2626,
    bandHex: 0xfacc15,
    primaryCss: '#059669',
    secondaryCss: '#fef3c7',
    stripeCss: '#dc2626',
    bandCss: '#facc15',
    textCss: '#fef08a',
  },
  {
    id: 'andino',
    name: 'Andino Cobalt',
    primaryHex: 0x1d4ed8,
    secondaryHex: 0xf8fafc,
    stripeHex: 0xfacc15,
    bandHex: 0xdc2626,
    primaryCss: '#1d4ed8',
    secondaryCss: '#f8fafc',
    stripeCss: '#facc15',
    bandCss: '#dc2626',
    textCss: '#fef08a',
  },
  {
    id: 'carnaval',
    name: 'Fiesta Crimson',
    primaryHex: 0xb91c1c,
    secondaryHex: 0xfef08a,
    stripeHex: 0xf97316,
    bandHex: 0xfacc15,
    primaryCss: '#b91c1c',
    secondaryCss: '#fef08a',
    stripeCss: '#f97316',
    bandCss: '#facc15',
    textCss: '#ffffff',
  },
  {
    id: 'selva',
    name: 'Selva Jade',
    primaryHex: 0x15803d,
    secondaryHex: 0xecfccb,
    stripeHex: 0x0284c7,
    bandHex: 0xfacc15,
    primaryCss: '#15803d',
    secondaryCss: '#ecfccb',
    stripeCss: '#0284c7',
    bandCss: '#facc15',
    textCss: '#fef08a',
  },
  {
    id: 'sunburst',
    name: 'Solar Saffron',
    primaryHex: 0xd97706,
    secondaryHex: 0xfffbeb,
    stripeHex: 0x991b1b,
    bandHex: 0xfef08a,
    primaryCss: '#d97706',
    secondaryCss: '#fffbeb',
    stripeCss: '#991b1b',
    bandCss: '#fef08a',
    textCss: '#111827',
  },
  {
    id: 'obsidian',
    name: 'Nocturno Gold',
    primaryHex: 0x18181b,
    secondaryHex: 0xfde047,
    stripeHex: 0xe11d48,
    bandHex: 0xf59e0b,
    primaryCss: '#18181b',
    secondaryCss: '#fde047',
    stripeCss: '#e11d48',
    bandCss: '#f59e0b',
    textCss: '#fde047',
  },
];

export const STICKERS: StickerOption[] = [
  {
    id: 'horn_ok',
    name: 'Horn OK Please',
    shortLabel: 'Horn OK',
    tagline: 'Folkloric lotus & warning eyes',
    accentCss: '#facc15',
  },
  {
    id: 'condor',
    name: 'Andean Condor',
    shortLabel: 'Condor',
    tagline: 'Golden wings crest',
    accentCss: '#f59e0b',
  },
  {
    id: 'chola',
    name: 'Aguayo Fiesta',
    shortLabel: 'Aguayo',
    tagline: 'Woven textile & floral garland',
    accentCss: '#ec4899',
  },
  {
    id: 'chili',
    name: 'Puro Fuego',
    shortLabel: 'Flames',
    tagline: 'Turbo chili & twin flames',
    accentCss: '#ef4444',
  },
  {
    id: 'camba_star',
    name: 'Camba Crest',
    shortLabel: 'Crest',
    tagline: 'Star shield & tricolor ribbon',
    accentCss: '#10b981',
  },
  {
    id: 'none',
    name: 'Clean Factory',
    shortLabel: 'None',
    tagline: 'Classic trim without decals',
    accentCss: '#9ca3af',
  },
];

export function getPaintJob(id: PaintJobId): PaintJobOption {
  return PAINT_JOBS.find((p) => p.id === id) ?? PAINT_JOBS[0];
}

export function getStickerOption(id: StickerId): StickerOption {
  return STICKERS.find((s) => s.id === id) ?? STICKERS[0];
}

export function getVehicleOption(id: VehicleType): VehicleOption {
  return VEHICLE_OPTIONS.find((v) => v.id === id) ?? VEHICLE_OPTIONS[0];
}

export function getWorldOption(id: WorldType): WorldOption {
  return WORLD_OPTIONS.find((w) => w.id === id) ?? WORLD_OPTIONS[0];
}
