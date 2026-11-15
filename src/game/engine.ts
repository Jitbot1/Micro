import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import {
  BusRig,
  CaimanRig,
  CowRig,
  DogRig,
  FallingTreeRig,
  PedestrianRig,
  PoliceRig,
  RuinPillarRig,
  VendorRig,
  createAlienCrystalCluster,
  createAlienMonolith,
  createAncientRuinObstacle,
  createAncientRuinsBackdrop,
  createArrowMesh,
  createBarricade,
  createBioluminescentCluster,
  createBulletMesh,
  createCow,
  createDestinationArch,
  createDog,
  createFallingJungleTree,
  createFlotaBus,
  createForkSignArch,
  createJungleBoulder,
  createJungleCaiman,
  createJungleCanopyArch,
  createJungleChaser,
  createJungleJeep,
  createJungleMudPuddle,
  createJungleTree,
  createJungleUndergrowth,
  createLavaFlowPool,
  createLavaVolcanoSpire,
  createMarketStall,
  createMarsButte,
  createMarsHabitatDome,
  createMotorbike,
  createMountainCliff,
  createMudPit,
  createOverheadPowerSpan,
  createPalmTree,
  createPedestrian,
  createPickupTruck,
  createPlayerTaxi,
  createPoliceCar,
  createRaiderBuggy,
  createRoadPickupMesh,
  createRoadQuadMesh,
  createRoadTrash,
  createRollingLog,
  createSantaCruzMicro,
  createSedan,
  createSkyDome,
  createStreetLamp,
  createTorito,
  createTropicalBuilding,
  createTrufiHatchback,
  createVendorCart,
  createWoodGuardPost,
  createWreckedCar,
} from './models';
import { ProceduralTextures, createProceduralTextures } from './textures';
import { getPaintJob, getVehicleOption } from './customization';
import {
  BoosterKind,
  CHUNK_LENGTH,
  CameraMode,
  FORWARD_LANES,
  GameMode,
  GamePhase,
  HudState,
  INITIAL_HUD_STATE,
  LANE_CENTERS,
  NUM_CHUNKS,
  OPPOSING_LANES,
  ObstacleKind,
  PaintJobId,
  ROAD_WIDTH,
  RadioStation,
  RoadPickupKind,
  SIDEWALK_WIDTH,
  StickerId,
  TrafficKind,
  VehicleType,
  WeatherKind,
  WorldType,
} from './types';

interface TrafficEntity {
  kind: TrafficKind;
  mesh: THREE.Group;
  x: number;
  z: number;
  dir: -1 | 1; // -1 = heading toward -Z (same direction as bus), +1 = heading toward +Z (opposing)
  wrongWay: boolean;
  baseSide: -1 | 1; // -1 = left (opposing) half, +1 = right (forward) half
  speed: number;
  currentSpeed: number;
  targetX: number;
  weaveTimer: number;
  circumventTimer: number;
  hornReactMode: 'none' | 'swerve' | 'brakeJam';
  hornReactTimer: number;
  hornPitch: number;
  halfW: number;
  halfL: number;
  damage: number;
  nearMissed: boolean;
  knockedOut: boolean;
  knockVx: number;
  knockVz: number;
  knockSpin: number;
}

interface ObstacleEntity {
  kind: ObstacleKind;
  mesh: THREE.Group;
  cowRig?: CowRig;
  dogRig?: DogRig;
  pedRig?: PedestrianRig;
  vendorRig?: VendorRig;
  fallingTreeRig?: FallingTreeRig;
  caimanRig?: CaimanRig;
  ruinRig?: RuinPillarRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  hitX?: number;
  startled: boolean;
  startleDir: number;
  hit: boolean;
  shootable?: boolean;
  hp?: number;
  knockVx: number;
  knockVy: number;
  knockVz: number;
  animPhase: number;
  halfW: number;
  halfL: number;
  fallTriggered?: boolean;
  fallProgress?: number;
  fallDir?: number;
  dodged?: boolean;
}

interface BulletProjectile {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
}

interface ArrowProjectile {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
}

interface RaiderEntity {
  mesh: THREE.Group;
  wheels: THREE.Object3D[];
  turret: THREE.Group;
  x: number;
  z: number;
  targetX: number;
  speed: number;
  hp: number;
  fireTimer: number;
  weaveTimer: number;
  knockedOut: boolean;
  knockVx: number;
  knockVy: number;
  knockVz: number;
  knockSpin: number;
}

interface RoadPickupEntity {
  kind: RoadPickupKind;
  mesh: THREE.Group;
  spinGroup: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  collected: boolean;
  phase: number;
}

type ChunkSegment = 'straight' | 'split_entry' | 'split_body' | 'split_exit';

interface ForkOptionConfig {
  leftLabel: string;
  rightLabel: string;
  leftBonus: string;
  rightBonus: string;
  accentHex: number;
}

const FORK_CONFIGS: Record<WorldType, ForkOptionConfig> = {
  city: {
    leftLabel: 'MERCADO ROUTE',
    rightLabel: 'AV. EXPRESS',
    leftBonus: '+800 PTS · +20% TURBO',
    rightBonus: '+650 PTS · +15% REPAIR',
    accentHex: 0x059669,
  },
  mountain: {
    leftLabel: 'RIDGE TRAIL',
    rightLabel: 'VALLEY BYPASS',
    leftBonus: '+900 PTS · +25% TURBO',
    rightBonus: '+700 PTS · +15% REPAIR',
    accentHex: 0x0284c7,
  },
  jungle: {
    leftLabel: 'CANYON TRAIL',
    rightLabel: 'RUINS PATH',
    leftBonus: '+1000 PTS · +25% TURBO',
    rightBonus: '+800 PTS · +15% REPAIR',
    accentHex: 0x15803d,
  },
};

interface PickupZone {
  active: boolean;
  group: THREE.Group;
  passengers: PedestrianRig[];
  padMat: THREE.MeshBasicMaterial;
  beamMat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  timer: number;
  maxTimer: number;
  progress: number;
}

interface Particle {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface TrashEntity {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  scattered: boolean;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinZ: number;
}

type RealmKind =
  | 'urban'
  | 'sunsetUrban'
  | 'nightUrban'
  | 'flota'
  | 'jungle'
  | 'canyon'
  | 'highland'
  | 'nightJungle'
  | 'lava'
  | 'alien'
  | 'mars';

interface RealmDefinition {
  id: string;
  name: string;
  kind: RealmKind;
  skyTop: number;
  skyMid: number;
  skyHorizon: number;
  skySun: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  groundColor: number;
}

const URBAN_REALMS: RealmDefinition[] = [
  {
    id: 'urban-noon',
    name: 'SANTA CRUZ NOON',
    kind: 'urban',
    skyTop: 0x1d6fa5,
    skyMid: 0x7cc4e8,
    skyHorizon: 0xf6cf88,
    skySun: 0xfffbeb,
    fogColor: 0xf2c87e,
    fogDensity: 0.0054,
    sunColor: 0xfff4d4,
    sunIntensity: 2.1,
    hemiSky: 0xfffbeb,
    hemiGround: 0x78350f,
    hemiIntensity: 0.88,
    groundColor: 0xc69c6d,
  },
  {
    id: 'urban-sunset',
    name: 'GOLDEN SUNSET ANILLO',
    kind: 'sunsetUrban',
    skyTop: 0x3b1d5e,
    skyMid: 0xd95f59,
    skyHorizon: 0xfbb040,
    skySun: 0xffb703,
    fogColor: 0xe68a5c,
    fogDensity: 0.006,
    sunColor: 0xffae52,
    sunIntensity: 1.85,
    hemiSky: 0xfecdd3,
    hemiGround: 0x581c1c,
    hemiIntensity: 0.78,
    groundColor: 0x9b6b4f,
  },
  {
    id: 'urban-night',
    name: 'NEON TROPICAL NIGHT',
    kind: 'nightUrban',
    skyTop: 0x05091a,
    skyMid: 0x111c3a,
    skyHorizon: 0x2a2452,
    skySun: 0x93c5fd,
    fogColor: 0x181c36,
    fogDensity: 0.0068,
    sunColor: 0x93c5fd,
    sunIntensity: 1.05,
    hemiSky: 0x64748b,
    hemiGround: 0x0f172a,
    hemiIntensity: 0.65,
    groundColor: 0x26293a,
  },
  {
    id: 'urban-outskirts',
    name: 'YUNGAS HIGHWAY EDGE',
    kind: 'flota',
    skyTop: 0x1e6091,
    skyMid: 0x76c893,
    skyHorizon: 0xd9ed92,
    skySun: 0xfffbeb,
    fogColor: 0xc8ddb3,
    fogDensity: 0.0055,
    sunColor: 0xfff7d6,
    sunIntensity: 1.95,
    hemiSky: 0xecfdf5,
    hemiGround: 0x3f6212,
    hemiIntensity: 0.85,
    groundColor: 0x4b6a32,
  },
];

const FLOTA_REALMS: RealmDefinition[] = [
  {
    id: 'flota-yungas',
    name: 'YUNGAS JUNGLE & CLIFFS',
    kind: 'flota',
    skyTop: 0x1e6091,
    skyMid: 0x7cc4b5,
    skyHorizon: 0xd2dfb8,
    skySun: 0xfffbeb,
    fogColor: 0xd2dfb8,
    fogDensity: 0.0052,
    sunColor: 0xfff4d4,
    sunIntensity: 2.05,
    hemiSky: 0xecfdf5,
    hemiGround: 0x3f6212,
    hemiIntensity: 0.86,
    groundColor: 0x45662d,
  },
  {
    id: 'flota-canyon',
    name: 'RED CANYON HIGHLANDS',
    kind: 'canyon',
    skyTop: 0x4a1d3f,
    skyMid: 0xd96b43,
    skyHorizon: 0xf7b267,
    skySun: 0xffc857,
    fogColor: 0xe68d65,
    fogDensity: 0.0058,
    sunColor: 0xffb668,
    sunIntensity: 1.95,
    hemiSky: 0xfed7aa,
    hemiGround: 0x7c2d12,
    hemiIntensity: 0.8,
    groundColor: 0x8f472c,
  },
  {
    id: 'flota-highland',
    name: 'ANDEAN CLOUD PASS',
    kind: 'highland',
    skyTop: 0x1d4e6b,
    skyMid: 0x5aa0a8,
    skyHorizon: 0x9ec5c8,
    skySun: 0xe0f2fe,
    fogColor: 0x8db8bc,
    fogDensity: 0.0066,
    sunColor: 0xe0f2fe,
    sunIntensity: 1.75,
    hemiSky: 0xcffafe,
    hemiGround: 0x1e3a3a,
    hemiIntensity: 0.84,
    groundColor: 0x44594f,
  },
  {
    id: 'flota-night',
    name: 'BIOLUMINESCENT NIGHT',
    kind: 'nightJungle',
    skyTop: 0x060b1c,
    skyMid: 0x102542,
    skyHorizon: 0x1b4353,
    skySun: 0x67e8f9,
    fogColor: 0x13283c,
    fogDensity: 0.0072,
    sunColor: 0x67e8f9,
    sunIntensity: 1.05,
    hemiSky: 0x38bdf8,
    hemiGround: 0x062019,
    hemiIntensity: 0.68,
    groundColor: 0x14332a,
  },
];

const JUNGLE_REALMS: RealmDefinition[] = [
  {
    id: 'jungle-amazonia',
    name: 'EMERALD AMAZONIA',
    kind: 'jungle',
    skyTop: 0x155e63,
    skyMid: 0x52a878,
    skyHorizon: 0x9fc2a2,
    skySun: 0xfef3c7,
    fogColor: 0x9fc2a2,
    fogDensity: 0.0066,
    sunColor: 0xfff5d6,
    sunIntensity: 2.0,
    hemiSky: 0xd1fae5,
    hemiGround: 0x264219,
    hemiIntensity: 0.88,
    groundColor: 0x3a5f26,
  },
  {
    id: 'jungle-canyon',
    name: 'CRIMSON SUNSET CANYON',
    kind: 'canyon',
    skyTop: 0x4a1d3f,
    skyMid: 0xd96b43,
    skyHorizon: 0xf7b267,
    skySun: 0xffc857,
    fogColor: 0xe88d67,
    fogDensity: 0.006,
    sunColor: 0xffb364,
    sunIntensity: 1.92,
    hemiSky: 0xfed7aa,
    hemiGround: 0x7c2d12,
    hemiIntensity: 0.82,
    groundColor: 0x8f472c,
  },
  {
    id: 'jungle-cloud',
    name: 'YUNGAS CLOUD FOREST',
    kind: 'highland',
    skyTop: 0x1d4e6b,
    skyMid: 0x5aa0a8,
    skyHorizon: 0x9ec5c8,
    skySun: 0xe0f2fe,
    fogColor: 0x84b6b8,
    fogDensity: 0.007,
    sunColor: 0xe0f2fe,
    sunIntensity: 1.72,
    hemiSky: 0xcffafe,
    hemiGround: 0x1e3a3a,
    hemiIntensity: 0.86,
    groundColor: 0x425b50,
  },
  {
    id: 'jungle-biolum',
    name: 'BIOLUMINESCENT NIGHT',
    kind: 'nightJungle',
    skyTop: 0x060b1c,
    skyMid: 0x102542,
    skyHorizon: 0x1b4353,
    skySun: 0x67e8f9,
    fogColor: 0x13283c,
    fogDensity: 0.0074,
    sunColor: 0x67e8f9,
    sunIntensity: 1.05,
    hemiSky: 0x38bdf8,
    hemiGround: 0x062019,
    hemiIntensity: 0.72,
    groundColor: 0x15342b,
  },
];

const EXOTIC_REALMS: RealmDefinition[] = [
  {
    id: 'exotic-lava',
    name: 'VOLCANIC LAVA CALDERA',
    kind: 'lava',
    skyTop: 0x1c0707,
    skyMid: 0x7c1d13,
    skyHorizon: 0xf97316,
    skySun: 0xfde047,
    fogColor: 0x9c3219,
    fogDensity: 0.0062,
    sunColor: 0xfb923c,
    sunIntensity: 2.05,
    hemiSky: 0xfdba74,
    hemiGround: 0x450a0a,
    hemiIntensity: 0.85,
    groundColor: 0x291612,
  },
  {
    id: 'exotic-alien',
    name: 'FUTURISTIC ALIEN GRID',
    kind: 'alien',
    skyTop: 0x05041a,
    skyMid: 0x1e1b4b,
    skyHorizon: 0x22d3ee,
    skySun: 0xe879f9,
    fogColor: 0x1a1446,
    fogDensity: 0.0058,
    sunColor: 0x67e8f9,
    sunIntensity: 1.55,
    hemiSky: 0x38bdf8,
    hemiGround: 0x3b0764,
    hemiIntensity: 0.82,
    groundColor: 0x11102a,
  },
  {
    id: 'exotic-mars',
    name: 'MARTIAN RED CANYON',
    kind: 'mars',
    skyTop: 0x451208,
    skyMid: 0x9a3412,
    skyHorizon: 0xfb923c,
    skySun: 0xfef3c7,
    fogColor: 0xb85232,
    fogDensity: 0.006,
    sunColor: 0xfdba74,
    sunIntensity: 1.95,
    hemiSky: 0xfed7aa,
    hemiGround: 0x431407,
    hemiIntensity: 0.84,
    groundColor: 0x7c2d12,
  },
];

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _colorTmp = new THREE.Color();
const _weatherColorTmp = new THREE.Color();
const _weatherMat4 = new THREE.Matrix4();
const _weatherQuat = new THREE.Quaternion();
const _weatherEuler = new THREE.Euler(0.18, 0, -0.08);
const _weatherScale = new THREE.Vector3(1, 1, 1);

const WEATHER_CYCLE: WeatherKind[] = ['sunny', 'dusty', 'heavyRain', 'monsoon', 'blizzard'];
const RAIN_COUNT = 220;
const DUST_COUNT = 150;
const SNOW_COUNT = 260;

export class SantaCruzMicroEngine {
  private container: HTMLElement;
  private onHudUpdate: (hud: HudState) => void;
  private sound = new SoundEngine();

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private skyDome!: THREE.Mesh;
  private infiniteGroundMat: THREE.MeshStandardMaterial | null = null;
  private textures!: ProceduralTextures;
  private isSoftwareGl = false;

  private frameId = 0;
  private disposed = false;
  private lastTimestamp = 0;
  private elapsed = 0;
  private exhaustTimer = 0;
  private dirtDustTimer = 0;

  // Chunks & Environment group
  private envGroup = new THREE.Group();
  private chunks: THREE.Group[] = [];

  // Hero Vehicles (Micro, Flota, Taxi Express, Jungle Jeep)
  private microBus!: BusRig;
  private flotaBus!: BusRig;
  private taxiCar!: BusRig;
  private jungleJeep!: BusRig;
  private bus!: BusRig;
  private busX = 1.95;
  private busZ = 0;
  private busVx = 0;
  private busSpeed = 16; // m/s
  private busRoll = 0;
  private busPitch = 0;
  private invulnTimer = 0;
  private hitstopTimer = 0;
  private cameraShake = 0;
  private cameraMode: CameraMode = 'chase';

  // Game State
  private phase: GamePhase = 'title';
  private vehicleType: VehicleType = 'micro';
  private worldType: WorldType = 'city';
  private paintJob: PaintJobId = 'camba';
  private sticker: StickerId = 'horn_ok';
  private health = 100;
  private maxHealth = 100;
  private fuel = 100;
  private maxFuel = 100;
  private fuelCollected = 0;
  private boostersCollected = 0;
  private activeBooster: BoosterKind | null = null;
  private activeBoosterTimer = 0;
  private lowFuelBeepCooldown = 0;
  private score = 0;
  private highScore = 0;
  private passengersPicked = 0;
  private combo = 1;
  private boostCharge = 100;
  private isBoosting = false;
  private hornCooldown = 0;
  private pedestrianStrikes = 0;
  private totalPedestriansHit = 0;
  private policeEscapes = 0;
  private nextPickupDelay = 2.0;
  private toastText: string | null = null;
  private toastTone: 'gold' | 'green' | 'red' | 'blue' = 'gold';
  private toastTimer = 0;
  private gameOverReason = '';

  // Taxi Express Destination Race State (>= 3 min realistic runs)
  private destArch!: THREE.Group;
  private taxiStage = 1;
  private taxiStageDistance = 5400;
  private taxiStageStartZ = 0;
  private taxiElapsed = 0;
  private taxiTimeLeft = 195;
  private taxiBestTime: number | null = null;

  // Bus Mission Level Objective (city & flota): pick up target commuters before level end
  private missionLevel = 1;
  private missionCommutersPicked = 0;
  private missionTargetCommuters = 4;
  private missionLevelDistance = 1620;
  private missionLevelStartZ = 0;
  private missionLevelTargetZ = -1620;
  private missionStopsCompleted = 0;

  // Jungle Expedition State + 3-Minute Rival 4x4 Chaser
  private jungleDistance = 0;
  private jungleDodged = 0;
  private jungleRunTime = 0;
  private jungleChaser!: PoliceRig;
  private jungleChaserActive = false;
  private jungleChaserX = 0;
  private jungleChaserZ = 40;
  private jungleChaserSpeed = 0;
  private jungleChaserTimer = 0;
  private jungleChaserMaxTimer = 24;
  private jungleChaserCooldown = 0;
  private jungleChaserEscapes = 0;
  private jungleChaserFlashPhase = 0;

  // Dynamic Realm Progression (switches smoothly every 30s–45s while vehicle is in motion)
  private realmIdx = 0;
  private realmTimer = 0;
  private readonly realmDuration = 45;
  private nextRealmScore = 10000;
  private exoticStage = 0; // 0 = native world, 1 = Lava, 2 = Alien, 3 = Mars

  // Cycling Weather System (sunny -> dusty -> heavyRain -> monsoon -> blizzard)
  private weatherIdx = 0;
  private weatherTimer = 0;
  private readonly weatherDuration = 36;
  private lightningFlash = 0;
  private thunderCooldown = 8;
  private rainSplashTimer = 0;
  private snowSprayTimer = 0;
  private rainInstanced!: THREE.InstancedMesh;
  private dustInstanced!: THREE.InstancedMesh;
  private snowInstanced!: THREE.InstancedMesh;
  private rainPos = new Float32Array(RAIN_COUNT * 3);
  private dustPos = new Float32Array(DUST_COUNT * 3);
  private snowPos = new Float32Array(SNOW_COUNT * 3);

  // Dynamic entities
  private traffic: TrafficEntity[] = [];
  private obstacles: ObstacleEntity[] = [];
  private trashItems: TrashEntity[] = [];
  private bullets: BulletProjectile[] = [];
  private arrows: ArrowProjectile[] = [];
  private raiders: RaiderEntity[] = [];
  private roadPickups: RoadPickupEntity[] = [];
  private trafficSpawnCursorZ = -80;
  private obstacleSpawnCursorZ = -110;
  private trashSpawnCursorZ = -25;
  private roadPickupSpawnCursorZ = -48;
  private rearTrafficCooldown = 0;

  // Jungle Machine Gun, Raider & Mud/Fork State
  private gunHeat = 0;
  private gunOverheated = false;
  private gunFireCooldown = 0;
  private muzzleFlashTimer = 0;
  private obstaclesDestroyed = 0;
  private raidersDestroyed = 0;
  private raiderSpawnTimer = 6.5;
  private chaserArrowTimer = 3.2;
  private mudSlowTimer = 0;
  private mudSoundCooldown = 0;
  private forkChosenSide: 'left' | 'right' | null = null;
  private forkRewardedCycle = -1;
  private pointerFiring = false;

  // Pickup Zone
  private pickup!: PickupZone;

  // Balanced Bolivian Police Pursuit
  private police!: PoliceRig;
  private policeActive = false;
  private policeX = 0;
  private policeZ = 40;
  private policeSpeed = 0;
  private policeTimer = 0;
  private policeMaxTimer = 18;
  private policeFlashPhase = 0;

  // Air Horn shockwave ring
  private hornWave!: THREE.Mesh;
  private hornWaveMat!: THREE.MeshBasicMaterial;
  private hornWaveTimer = 0;

  // Pooled particles
  private particles: Particle[] = [];

  // Input state
  private heldKeys = new Set<string>();
  private virtualInput = {
    accel: false,
    brake: false,
    left: false,
    right: false,
    boost: false,
    fire: false,
  };
  private hudSyncTimer = 0;

  constructor(container: HTMLElement, onHudUpdate: (hud: HudState) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    try {
      const saved = localStorage.getItem('scz_micro_high_score');
      if (saved) this.highScore = parseInt(saved, 10) || 0;
      const savedBestTaxi = localStorage.getItem('scz_taxi_best_time');
      if (savedBestTaxi) {
        const parsed = parseFloat(savedBestTaxi);
        if (!Number.isNaN(parsed) && parsed > 0) this.taxiBestTime = parsed;
      }
      const savedVeh = localStorage.getItem('scz_vehicle_type');
      if (savedVeh === 'micro' || savedVeh === 'flota' || savedVeh === 'taxi' || savedVeh === 'jungleJeep') {
        this.vehicleType = savedVeh;
      }
      const savedWorld = localStorage.getItem('scz_world_type');
      if (savedWorld === 'city' || savedWorld === 'mountain' || savedWorld === 'jungle') {
        this.worldType = savedWorld;
      }
      const savedPaint = localStorage.getItem('scz_paint_job');
      if (
        savedPaint === 'camba' ||
        savedPaint === 'andino' ||
        savedPaint === 'carnaval' ||
        savedPaint === 'selva' ||
        savedPaint === 'sunburst' ||
        savedPaint === 'obsidian'
      ) {
        this.paintJob = savedPaint;
      }
      const savedSticker = localStorage.getItem('scz_sticker');
      if (
        savedSticker === 'horn_ok' ||
        savedSticker === 'condor' ||
        savedSticker === 'chola' ||
        savedSticker === 'chili' ||
        savedSticker === 'camba_star' ||
        savedSticker === 'none'
      ) {
        this.sticker = savedSticker;
      }
    } catch {
      // ignore storage errors
    }

    this.initThree();
    this.buildEnvironment();
    this.buildActors();
    this.applyVehicleDecoration();
    this.bindEvents();
    this.busX = this.worldType === 'jungle' ? 0 : 1.95;
    this.bus.root.position.set(this.busX, 0, this.busZ);
    this.seedInitialWorld();
    this.emitHud(true);

    this.lastTimestamp = performance.now();
    this.scheduleNextFrame();
  }

  private detectSoftwareGl(): boolean {
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) return true;
    const ext = probe.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
    const gpu = String(probe.getParameter(param));
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initThree(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Hot sun-baked Santa Cruz tropical sky & dusty horizon haze
    const skyColor = new THREE.Color(0xf6cf88);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xf2c87e, 0.0056);

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.25, 400);
    this.camera.position.set(3.5, 5.0, 11.0);

    this.skyDome = createSkyDome();
    this.scene.add(this.skyDome);

    // Mandatory Studio Environment Reflections (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Tropical sun-baked 3-point outdoor lighting
    this.hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x78350f, 0.88);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4d4, 2.1);
    this.sunLight.position.set(28, 46, 18);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const d = 42;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 135;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.48);
    rimLight.position.set(-24, 18, -32);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.scene.add(this.envGroup);
  }

  private deriveGameMode(): GameMode {
    if (this.vehicleType === 'taxi') return 'taxi';
    if (this.vehicleType === 'jungleJeep') return 'jungle';
    if (this.vehicleType === 'flota') return 'flota';
    if (this.worldType === 'jungle') return 'jungle';
    if (this.worldType === 'mountain') return 'flota';
    return 'city';
  }

  private getActiveRealmList(): RealmDefinition[] {
    if (this.worldType === 'mountain') return FLOTA_REALMS;
    if (this.worldType === 'jungle') return JUNGLE_REALMS;
    return URBAN_REALMS;
  }

  private getActiveRealm(): RealmDefinition {
    if (this.exoticStage > 0) {
      return EXOTIC_REALMS[(this.exoticStage - 1) % EXOTIC_REALMS.length];
    }
    const list = this.getActiveRealmList();
    return list[this.realmIdx % list.length];
  }

  private applyRealmLightingInstant(realm: RealmDefinition): void {
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.setHex(realm.fogColor);
      fog.density = realm.fogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(realm.fogColor, realm.fogDensity);
    }
    const uniforms = (this.skyDome.material as THREE.ShaderMaterial).uniforms;
    uniforms.uTopColor.value.setHex(realm.skyTop);
    uniforms.uMidColor.value.setHex(realm.skyMid);
    uniforms.uHorizonColor.value.setHex(realm.skyHorizon);
    uniforms.uSunColor.value.setHex(realm.skySun);

    this.sunLight.color.setHex(realm.sunColor);
    this.sunLight.intensity = realm.sunIntensity;
    this.hemiLight.color.setHex(realm.hemiSky);
    this.hemiLight.groundColor.setHex(realm.hemiGround);
    this.hemiLight.intensity = realm.hemiIntensity;

    if (this.infiniteGroundMat) {
      this.infiniteGroundMat.color.setHex(realm.groundColor);
    }
  }

  private updateRealmTransition(dt: number): void {
    const realm = this.getActiveRealm();
    const weather = this.getActiveWeather();
    const rate = 1 - Math.exp(-0.55 * dt);

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
    }

    // Blend Realm + Weather effects on fog, sky dome, and sun lighting (visibility!)
    const weatherFogAdd =
      weather === 'blizzard'
        ? 0.0115
        : weather === 'monsoon'
          ? 0.0085
          : weather === 'heavyRain'
            ? 0.0064
            : weather === 'dusty'
              ? 0.0056
              : 0;
    const targetFogDensity = realm.fogDensity + weatherFogAdd;

    _colorTmp.setHex(realm.fogColor);
    if (weather === 'blizzard') {
      _weatherColorTmp.setHex(0xdce8f5);
      _colorTmp.lerp(_weatherColorTmp, 0.78);
    } else if (weather === 'monsoon') {
      _weatherColorTmp.setHex(0x4b5f73);
      _colorTmp.lerp(_weatherColorTmp, 0.65);
    } else if (weather === 'heavyRain') {
      _weatherColorTmp.setHex(0x526478);
      _colorTmp.lerp(_weatherColorTmp, 0.56);
    } else if (weather === 'dusty') {
      _weatherColorTmp.setHex(0xd8a86a);
      _colorTmp.lerp(_weatherColorTmp, 0.58);
    }

    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.lerp(_colorTmp, rate);
      fog.density = THREE.MathUtils.lerp(fog.density, targetFogDensity, rate);
    }

    const uniforms = (this.skyDome.material as THREE.ShaderMaterial).uniforms;
    _colorTmp.setHex(realm.skyTop);
    if (weather === 'blizzard') _colorTmp.lerp(_weatherColorTmp.setHex(0x94a3b8), 0.72);
    else if (weather === 'monsoon') _colorTmp.lerp(_weatherColorTmp.setHex(0x1e293b), 0.72);
    else if (weather === 'heavyRain') _colorTmp.lerp(_weatherColorTmp.setHex(0x334155), 0.6);
    else if (weather === 'dusty') _colorTmp.lerp(_weatherColorTmp.setHex(0x9a7b4f), 0.45);
    uniforms.uTopColor.value.lerp(_colorTmp, rate);

    _colorTmp.setHex(realm.skyMid);
    if (weather === 'blizzard') _colorTmp.lerp(_weatherColorTmp.setHex(0xcbd5e1), 0.76);
    else if (weather === 'monsoon') _colorTmp.lerp(_weatherColorTmp.setHex(0x334155), 0.68);
    else if (weather === 'heavyRain') _colorTmp.lerp(_weatherColorTmp.setHex(0x475569), 0.6);
    else if (weather === 'dusty') _colorTmp.lerp(_weatherColorTmp.setHex(0xc9965b), 0.55);
    uniforms.uMidColor.value.lerp(_colorTmp, rate);

    _colorTmp.setHex(realm.skyHorizon);
    if (weather === 'blizzard') _colorTmp.lerp(_weatherColorTmp.setHex(0xe2e8f0), 0.8);
    else if (weather === 'monsoon') _colorTmp.lerp(_weatherColorTmp.setHex(0x64748b), 0.68);
    else if (weather === 'heavyRain') _colorTmp.lerp(_weatherColorTmp.setHex(0x748599), 0.62);
    else if (weather === 'dusty') _colorTmp.lerp(_weatherColorTmp.setHex(0xe5b87b), 0.62);
    uniforms.uHorizonColor.value.lerp(_colorTmp, rate);

    _colorTmp.setHex(realm.skySun);
    if (weather === 'blizzard') _colorTmp.lerp(_weatherColorTmp.setHex(0xe0f2fe), 0.78);
    else if (weather === 'monsoon' || weather === 'heavyRain') {
      _colorTmp.lerp(_weatherColorTmp.setHex(0x94a3b8), 0.75);
    }
    uniforms.uSunColor.value.lerp(_colorTmp, rate);

    const weatherSunScale =
      weather === 'monsoon'
        ? 0.58
        : weather === 'heavyRain'
          ? 0.72
          : weather === 'blizzard'
            ? 0.78
            : weather === 'dusty'
              ? 0.86
              : 1.0;
    const flashBoost = this.lightningFlash * 1.4;
    this.sunLight.color.lerp(_colorTmp.setHex(realm.sunColor), rate);
    this.sunLight.intensity =
      THREE.MathUtils.lerp(this.sunLight.intensity, realm.sunIntensity * weatherSunScale, rate) +
      flashBoost;

    this.hemiLight.color.lerp(
      _colorTmp.setHex(weather === 'blizzard' ? 0xe0f2fe : realm.hemiSky),
      rate,
    );
    this.hemiLight.groundColor.lerp(
      _colorTmp.setHex(weather === 'blizzard' ? 0x64748b : realm.hemiGround),
      rate,
    );
    this.hemiLight.intensity =
      THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        realm.hemiIntensity * (weather === 'monsoon' ? 0.78 : weather === 'blizzard' ? 0.96 : 1.0),
        rate,
      ) +
      flashBoost * 0.45;

    if (this.infiniteGroundMat) {
      _colorTmp.setHex(realm.groundColor);
      if (weather === 'blizzard') _colorTmp.lerp(_weatherColorTmp.setHex(0xcbd5e1), 0.62);
      else if (weather === 'monsoon' || weather === 'heavyRain') {
        _colorTmp.lerp(_weatherColorTmp.setHex(0x1f2937), 0.35);
      } else if (weather === 'dusty') {
        _colorTmp.lerp(_weatherColorTmp.setHex(0xb38b59), 0.3);
      }
      this.infiniteGroundMat.color.lerp(_colorTmp, rate);
    }
  }

  private disposeGroupMeshes(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const disposeMat = (mat: THREE.Material | undefined) => {
            if (!mat) return;
            const std = mat as THREE.MeshStandardMaterial;
            if (std.map && std.map.userData?.chunkLocal) {
              std.map.dispose();
            }
            mat.dispose();
          };
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => disposeMat(mat));
          } else {
            disposeMat(m.material);
          }
        }
      });
    }
  }

  private getSegmentForSeq(seqIdx: number): ChunkSegment {
    if (seqIdx < 6) return 'straight';
    const mod = ((seqIdx % 8) + 8) % 8;
    if (mod === 6) return 'split_entry';
    if (mod === 7 || mod === 0) return 'split_body';
    if (mod === 1) return 'split_exit';
    return 'straight';
  }

  private getForkCycleForSeq(seqIdx: number): number {
    if (seqIdx < 6) return -1;
    return Math.floor((seqIdx - 6) / 8);
  }

  private getRoadBoundsAtZ(z: number): {
    outerHalf: number;
    innerBarrierHalf: number;
    segment: ChunkSegment;
    seq: number;
    t: number;
  } {
    const seq = Math.floor((90 - z) / CHUNK_LENGTH);
    const localStart = 60 - seq * CHUNK_LENGTH + CHUNK_LENGTH / 2;
    const t = THREE.MathUtils.clamp((localStart - z) / CHUNK_LENGTH, 0, 1);
    const segment = this.getSegmentForSeq(seq);

    if (segment === 'split_entry') {
      const outerHalf = t <= 0.6667 ? THREE.MathUtils.lerp(7.8, 12.3, t / 0.6667) : 12.3;
      const innerBarrierHalf =
        t > 0.6667 ? THREE.MathUtils.lerp(0, 2.35, (t - 0.6667) / 0.3333) : 0;
      return { outerHalf, innerBarrierHalf, segment, seq, t };
    }
    if (segment === 'split_body') {
      return { outerHalf: 12.3, innerBarrierHalf: 2.35, segment, seq, t };
    }
    if (segment === 'split_exit') {
      const outerHalf = t >= 0.3333 ? THREE.MathUtils.lerp(12.3, 7.8, (t - 0.3333) / 0.6667) : 12.3;
      const innerBarrierHalf = t < 0.3333 ? THREE.MathUtils.lerp(2.35, 0, t / 0.3333) : 0;
      return { outerHalf, innerBarrierHalf, segment, seq, t };
    }
    return { outerHalf: ROAD_WIDTH / 2, innerBarrierHalf: 0, segment, seq, t };
  }

  private clampXToRoad(x: number, z: number, margin: number): number {
    const { outerHalf, innerBarrierHalf } = this.getRoadBoundsAtZ(z);
    if (innerBarrierHalf > 0.08) {
      if (x < 0) {
        return THREE.MathUtils.clamp(x, -(outerHalf - margin), -(innerBarrierHalf + margin));
      }
      return THREE.MathUtils.clamp(x, innerBarrierHalf + margin, outerHalf - margin);
    }
    return THREE.MathUtils.clamp(x, -(outerHalf - margin), outerHalf - margin);
  }

  private clearEnvironmentGroup(): void {
    this.chunks = [];
    this.infiniteGroundMat = null;
    this.disposeGroupMeshes(this.envGroup);
  }

  private buildEnvironment(): void {
    this.clearEnvironmentGroup();
    const realm = this.getActiveRealm();

    this.infiniteGroundMat = new THREE.MeshStandardMaterial({
      color: realm.groundColor,
      roughness: 0.96,
    });
    const groundGeo = new THREE.PlaneGeometry(460, 540);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.infiniteGroundMat);
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    ground.name = 'infiniteGround';
    this.envGroup.add(ground);

    for (let i = 0; i < NUM_CHUNKS; i++) {
      const chunk = new THREE.Group();
      chunk.position.z = 60 - i * CHUNK_LENGTH;
      chunk.userData.chunkIndex = i;
      chunk.userData.seqIdx = i;
      chunk.userData.segment = this.getSegmentForSeq(i);
      chunk.userData.realmId = realm.id;
      this.populateChunkForKind(chunk, i, realm.kind);
      this.envGroup.add(chunk);
      this.chunks.push(chunk);
    }

    this.applyRealmLightingInstant(realm);
  }

  private populateChunkForKind(chunk: THREE.Group, i: number, kind: RealmKind): void {
    const seg: ChunkSegment = chunk.userData.segment ?? this.getSegmentForSeq(i);
    const isSplitBody = seg === 'split_body';
    const isForkChunk = seg !== 'straight';
    const outerHalf = isForkChunk ? 12.3 : ROAD_WIDTH / 2;

    const addSegmentedRoad = (roadMat: THREE.Material, islandMat: THREE.Material, isUrban: boolean) => {
      if (seg === 'straight') {
        const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
        roadGeo.rotateX(-Math.PI / 2);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.y = 0.02;
        road.receiveShadow = true;
        chunk.add(road);
        return;
      }

      if (seg === 'split_entry') {
        const qA = createRoadQuadMesh(-7.8, 7.8, -12.3, 12.3, 40, roadMat, 1.3, 1.4);
        qA.position.set(0, 0.02, 10);
        chunk.add(qA);

        const qL = createRoadQuadMesh(-12.3, 0, -12.3, -2.35, 20, roadMat, 0.7, 0.8);
        qL.position.set(0, 0.02, -20);
        chunk.add(qL);

        const qR = createRoadQuadMesh(0, 12.3, 2.35, 12.3, 20, roadMat, 0.7, 0.8);
        qR.position.set(0, 0.02, -20);
        chunk.add(qR);

        const islandWedge = createRoadQuadMesh(-0.08, 0.08, -2.35, 2.35, 20, islandMat, 0.4, 0.8);
        islandWedge.position.set(0, 0.14, -20);
        chunk.add(islandWedge);

        // Glowing chevron nose bollard at start of center divider island
        const bollardMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.4,
        });
        const noseBollard = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.35, 8), bollardMat);
        noseBollard.position.set(0, 0.68, -10.5);
        chunk.add(noseBollard);

        // Overhead Junction Sign Arch announcing Left vs Right paths!
        const forkCfg = FORK_CONFIGS[this.worldType];
        const forkArch = createForkSignArch(
          forkCfg.leftLabel,
          this.vehicleType === 'taxi' ? '-150M GAIN · +600 PTS' : forkCfg.leftBonus,
          forkCfg.rightLabel,
          this.vehicleType === 'taxi' ? '+8S TIME · +500 PTS' : forkCfg.rightBonus,
          forkCfg.accentHex,
        );
        forkArch.position.set(0, 0, 16);
        chunk.add(forkArch);
        return;
      }

      if (seg === 'split_body') {
        for (const side of [-1, 1]) {
          const branch = new THREE.Mesh(new THREE.PlaneGeometry(9.95, CHUNK_LENGTH), roadMat);
          branch.rotation.x = -Math.PI / 2;
          branch.position.set(side * 7.325, 0.02, 0);
          branch.receiveShadow = true;
          chunk.add(branch);
        }
        const island = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.28, CHUNK_LENGTH), islandMat);
        island.position.set(0, 0.14, 0);
        island.receiveShadow = true;
        chunk.add(island);

        // Rich central divider props so the two routes feel distinct
        for (let iz = -22; iz <= 22; iz += 15) {
          if (kind === 'lava') {
            const spire = createLavaVolcanoSpire(i + Math.abs(iz));
            spire.scale.setScalar(0.38);
            spire.position.set(0, 0.28, iz);
            chunk.add(spire);
          } else if (kind === 'alien') {
            const crystal = createAlienCrystalCluster(i + Math.abs(iz));
            crystal.position.set(0, 0.28, iz);
            chunk.add(crystal);
          } else if (kind === 'mars') {
            const rock = createMarsButte(i + Math.abs(iz));
            rock.scale.setScalar(0.24);
            rock.position.set(0, 0.28, iz);
            chunk.add(rock);
          } else if (isUrban) {
            const palm = createPalmTree(0.95);
            palm.position.set(0, 0.28, iz);
            chunk.add(palm);
          } else {
            const tree = createJungleTree(1.0, i + Math.abs(iz));
            tree.position.set(0, 0.24, iz);
            chunk.add(tree);
          }
        }
        return;
      }

      // split_exit
      const qL = createRoadQuadMesh(-12.3, -2.35, -12.3, 0, 20, roadMat, 0.7, 0.8);
      qL.position.set(0, 0.02, 20);
      chunk.add(qL);

      const qR = createRoadQuadMesh(2.35, 12.3, 0, 12.3, 20, roadMat, 0.7, 0.8);
      qR.position.set(0, 0.02, 20);
      chunk.add(qR);

      const islandTaper = createRoadQuadMesh(-2.35, 2.35, -0.08, 0.08, 20, islandMat, 0.4, 0.8);
      islandTaper.position.set(0, 0.14, 20);
      chunk.add(islandTaper);

      const qB = createRoadQuadMesh(-12.3, 12.3, -7.8, 7.8, 40, roadMat, 1.3, 1.4);
      qB.position.set(0, 0.02, -10);
      chunk.add(qB);
    };

    if (kind === 'lava') {
      const lavaRoadMat = new THREE.MeshStandardMaterial({
        map: this.textures.lavaRoad,
        bumpMap: this.textures.asphaltBump,
        bumpScale: 0.055,
        emissive: 0xea580c,
        emissiveMap: this.textures.lavaRoad,
        emissiveIntensity: 0.35,
        roughness: 0.78,
        metalness: 0.12,
      });
      const basaltMat = new THREE.MeshStandardMaterial({
        map: this.textures.cliffRock,
        color: 0x3b2622,
        roughness: 0.94,
      });

      addSegmentedRoad(lavaRoadMat, basaltMat, false);

      for (const side of [-1, 1]) {
        const bank = new THREE.Mesh(
          new THREE.BoxGeometry(SIDEWALK_WIDTH + 2.2, 0.18, CHUNK_LENGTH),
          basaltMat,
        );
        bank.position.set(side * (outerHalf + (SIDEWALK_WIDTH + 2.2) / 2), 0.06, 0);
        bank.receiveShadow = true;
        chunk.add(bank);

        for (let bz = -CHUNK_LENGTH / 2 + 8; bz < CHUNK_LENGTH / 2; bz += 16) {
          const seed = i * 29 + Math.abs(bz) * 3 + (side > 0 ? 5 : 11);
          if (seed % 2 === 0) {
            const pool = createLavaFlowPool(3.8, 13.5);
            pool.position.set(side * (outerHalf + 2.4), 0.12, bz);
            chunk.add(pool);
          }
          const volcano = createLavaVolcanoSpire(seed);
          volcano.position.set(side * (outerHalf + SIDEWALK_WIDTH + 3.4), 0.04, bz);
          chunk.add(volcano);
        }
      }
      return;
    }

    if (kind === 'alien') {
      const alienRoadMat = new THREE.MeshStandardMaterial({
        map: this.textures.alienGrid,
        emissive: 0x38bdf8,
        emissiveMap: this.textures.alienGrid,
        emissiveIntensity: 0.48,
        roughness: 0.36,
        metalness: 0.42,
      });
      const deckMat = new THREE.MeshStandardMaterial({
        color: 0x161436,
        roughness: 0.55,
        metalness: 0.48,
      });
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.45,
        roughness: 0.25,
      });

      addSegmentedRoad(alienRoadMat, deckMat, false);

      if (seg === 'straight') {
        for (const az of [-15, 15]) {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(ROAD_WIDTH * 0.56, 0.22, 8, 22, Math.PI),
            railMat,
          );
          arch.position.set(0, 0.2, az);
          chunk.add(arch);
        }
      }

      for (const side of [-1, 1]) {
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(SIDEWALK_WIDTH + 2.0, 0.18, CHUNK_LENGTH),
          deckMat,
        );
        deck.position.set(side * (outerHalf + (SIDEWALK_WIDTH + 2.0) / 2), 0.06, 0);
        deck.receiveShadow = true;
        chunk.add(deck);

        if (seg === 'straight' || isSplitBody) {
          const neonRail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, CHUNK_LENGTH), railMat);
          neonRail.position.set(side * (outerHalf + 0.2), 0.22, 0);
          chunk.add(neonRail);
        }

        for (let bz = -CHUNK_LENGTH / 2 + 8; bz < CHUNK_LENGTH / 2; bz += 15) {
          const seed = i * 31 + Math.abs(bz) * 4 + (side > 0 ? 7 : 13);
          const crystal = createAlienCrystalCluster(seed);
          crystal.position.set(side * (outerHalf + 2.1), 0.14, bz - 3);
          chunk.add(crystal);

          const monolith = createAlienMonolith(seed);
          monolith.position.set(side * (outerHalf + SIDEWALK_WIDTH + 3.2), 0.06, bz + 2);
          chunk.add(monolith);
        }
      }
      return;
    }

    if (kind === 'mars') {
      const marsRoadMat = new THREE.MeshStandardMaterial({
        map: this.textures.marsRoad,
        bumpMap: this.textures.dirtBump,
        bumpScale: 0.068,
        roughness: 0.92,
        metalness: 0.02,
      });
      const regolithMat = new THREE.MeshStandardMaterial({
        map: this.textures.cliffRock,
        color: 0xa14424,
        roughness: 0.95,
      });

      addSegmentedRoad(marsRoadMat, regolithMat, false);

      for (const side of [-1, 1]) {
        const bank = new THREE.Mesh(
          new THREE.BoxGeometry(SIDEWALK_WIDTH + 2.2, 0.16, CHUNK_LENGTH),
          regolithMat,
        );
        bank.position.set(side * (outerHalf + (SIDEWALK_WIDTH + 2.2) / 2), 0.05, 0);
        bank.receiveShadow = true;
        chunk.add(bank);

        for (let bz = -CHUNK_LENGTH / 2 + 8; bz < CHUNK_LENGTH / 2; bz += 16) {
          const seed = i * 37 + Math.abs(bz) * 3 + (side > 0 ? 3 : 9);
          if ((i + (side > 0 ? 1 : 0)) % 3 === 0 && bz < 0) {
            const hab = createMarsHabitatDome();
            hab.position.set(side * (outerHalf + 4.4), 0.12, bz);
            if (side < 0) hab.rotation.y = Math.PI;
            chunk.add(hab);
          } else {
            const butte = createMarsButte(seed);
            butte.position.set(side * (outerHalf + SIDEWALK_WIDTH + 4.0), 0.04, bz);
            chunk.add(butte);
          }
        }
      }
      return;
    }

    if (kind === 'urban' || kind === 'sunsetUrban' || kind === 'nightUrban') {
      const isNight = kind === 'nightUrban';
      const roadMat = new THREE.MeshStandardMaterial({
        map: this.textures.asphalt,
        bumpMap: this.textures.asphaltBump,
        bumpScale: 0.035,
        roughness: 0.84,
        metalness: 0.05,
        color: isNight ? 0x94a3b8 : 0xffffff,
      });
      const studMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: isNight ? 1.2 : 0.45,
        roughness: 0.3,
      });
      const studGeo = new THREE.BoxGeometry(0.18, 0.045, 0.24);
      const swMat = new THREE.MeshStandardMaterial({
        map: this.textures.sidewalk,
        roughness: 0.9,
        color: isNight ? 0x94a3b8 : 0xffffff,
      });
      const curbMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.78 });
      const curbMatDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });

      const buildingColors = [0xf5d0a9, 0xe8b48a, 0xd97706, 0x10b981, 0x0284c7, 0xe11d48, 0xfde68a];
      const trimColors = [0x92400e, 0x065f46, 0x991b1b, 0x1e3a8a];
      const tarps = [this.textures.tarpA, this.textures.tarpB, this.textures.tarpC];

      addSegmentedRoad(roadMat, swMat, true);

      if (seg === 'straight') {
        for (let sz = -CHUNK_LENGTH / 2 + 3.75; sz < CHUNK_LENGTH / 2; sz += 7.5) {
          const stud = new THREE.Mesh(studGeo, studMat);
          stud.position.set(0, 0.04, sz);
          chunk.add(stud);
        }
      }

      for (const pz of [-15, 15]) {
        const powerSpan = createOverheadPowerSpan(outerHalf * 2);
        powerSpan.position.z = pz;
        chunk.add(powerSpan);
      }

      for (const side of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_WIDTH, 0.22, CHUNK_LENGTH), swMat);
        sw.position.set(side * (outerHalf + SIDEWALK_WIDTH / 2), 0.11, 0);
        sw.receiveShadow = true;
        chunk.add(sw);

        if (seg === 'straight' || isSplitBody) {
          for (let cz = -CHUNK_LENGTH / 2 + 2.5; cz < CHUNK_LENGTH / 2; cz += 5) {
            const isYellow = Math.abs(Math.round(cz / 5)) % 2 === 0;
            const curb = new THREE.Mesh(
              new THREE.BoxGeometry(0.35, 0.24, 4.9),
              isYellow ? curbMat : curbMatDark,
            );
            curb.position.set(side * (outerHalf + 0.15), 0.12, cz);
            chunk.add(curb);
          }
        }

        if (kind === 'sunsetUrban' || isNight) {
          for (const lz of [-18, 12]) {
            const lamp = createStreetLamp();
            lamp.position.set(side * (outerHalf + 0.8), 0.22, lz);
            if (side > 0) lamp.rotation.y = Math.PI;
            chunk.add(lamp);
          }
        }

        for (let bz = -CHUNK_LENGTH / 2 + 7.5; bz < CHUNK_LENGTH / 2; bz += 15) {
          const seed = (i * 17 + Math.abs(bz) + (side > 0 ? 5 : 11)) % 10;
          if (seed < 5) {
            const stall = createMarketStall(
              tarps[(i + Math.abs(bz)) % tarps.length],
              buildingColors[(i + seed) % buildingColors.length],
            );
            stall.position.set(side * (outerHalf + 2.3), 0.22, bz);
            if (side < 0) stall.rotation.y = Math.PI;
            chunk.add(stall);
          } else {
            const palm = createPalmTree(0.95 + (seed % 3) * 0.16);
            palm.position.set(side * (outerHalf + 2.4), 0.22, bz);
            chunk.add(palm);
          }

          const bH = 7.5 + ((i * 7 + Math.abs(bz) + (side > 0 ? 3 : 9)) % 9);
          const signTex =
            this.textures.shopSigns[(i + Math.abs(bz) + (side > 0 ? 1 : 0)) % this.textures.shopSigns.length];
          const b = createTropicalBuilding(
            buildingColors[(i + Math.abs(bz) + (side > 0 ? 1 : 4)) % buildingColors.length],
            trimColors[(i + seed) % trimColors.length],
            bH,
            7.6,
            12.8,
            signTex,
          );
          b.position.set(side * (outerHalf + SIDEWALK_WIDTH + 4.5), 0, bz);
          if (side < 0) b.rotation.y = Math.PI;
          chunk.add(b);
        }
      }
      return;
    }

    if (kind === 'flota' || kind === 'canyon' || kind === 'highland') {
      const roadTint = kind === 'canyon' ? 0xd98a6c : kind === 'highland' ? 0x9aa5a0 : 0xffffff;
      const shoulderTint = kind === 'canyon' ? 0xa35c3e : kind === 'highland' ? 0x5c7566 : 0xffffff;

      const dirtRoadMat = new THREE.MeshStandardMaterial({
        map: this.textures.dirtRoad,
        bumpMap: this.textures.dirtBump,
        bumpScale: 0.072,
        roughness: 0.94,
        metalness: 0.01,
        color: roadTint,
      });
      const shoulderMat = new THREE.MeshStandardMaterial({
        map: this.textures.jungleGround,
        roughness: 0.95,
        color: shoulderTint,
      });

      addSegmentedRoad(dirtRoadMat, shoulderMat, false);

      if (kind !== 'canyon' && seg === 'straight') {
        const canopyArch = createJungleCanopyArch(ROAD_WIDTH);
        canopyArch.position.z = i % 2 === 0 ? -10 : 12;
        chunk.add(canopyArch);
      }

      for (const side of [-1, 1]) {
        const shoulder = new THREE.Mesh(
          new THREE.BoxGeometry(SIDEWALK_WIDTH + 1.4, 0.14, CHUNK_LENGTH),
          shoulderMat,
        );
        shoulder.position.set(side * (outerHalf + (SIDEWALK_WIDTH + 1.4) / 2), 0.05, 0);
        shoulder.receiveShadow = true;
        chunk.add(shoulder);

        if ((i + (side > 0 ? 1 : 0)) % 2 === 0 && (seg === 'straight' || isSplitBody)) {
          for (let gz = -CHUNK_LENGTH / 2 + 5; gz < CHUNK_LENGTH / 2; gz += 10) {
            const guard = createWoodGuardPost();
            guard.position.set(side * (outerHalf + 0.45), 0.08, gz);
            chunk.add(guard);
          }
        }

        for (let bz = -CHUNK_LENGTH / 2 + 6; bz < CHUNK_LENGTH / 2; bz += 12) {
          const seed = i * 19 + Math.abs(bz) * 3 + (side > 0 ? 7 : 13);

          if (kind === 'canyon') {
            const palm = createPalmTree(0.95 + (seed % 3) * 0.18);
            palm.position.set(side * (outerHalf + 2.2), 0.1, bz - 2);
            chunk.add(palm);

            const cliffH = 18 + (seed % 5) * 3.8;
            const cliff = createMountainCliff(this.textures, cliffH, 12.2, 15.0, seed);
            cliff.position.set(side * (outerHalf + SIDEWALK_WIDTH + 4.2), 0, bz);
            chunk.add(cliff);
          } else {
            const bush = createJungleUndergrowth(0.9 + (seed % 3) * 0.22);
            bush.position.set(side * (outerHalf + 1.35 + (seed % 2) * 0.4), 0.1, bz - 2.5);
            chunk.add(bush);

            const tree = createJungleTree(1.0 + (seed % 4) * 0.18, seed);
            tree.position.set(side * (outerHalf + 3.2 + (seed % 3) * 1.1), 0.08, bz + 2.5);
            chunk.add(tree);

            const showCliff = kind === 'highland' || (i + (side < 0 ? 0 : 1)) % 3 !== 2 || seed % 2 === 0;
            if (showCliff) {
              const cliffH = (kind === 'highland' ? 20 : 16) + (seed % 5) * 3.2;
              const cliff = createMountainCliff(this.textures, cliffH, 11.5, 14.5, seed);
              cliff.position.set(side * (outerHalf + SIDEWALK_WIDTH + 4.8), 0, bz);
              chunk.add(cliff);
            } else {
              const backTree = createJungleTree(1.25 + (seed % 3) * 0.2, seed + 5);
              backTree.position.set(side * (outerHalf + SIDEWALK_WIDTH + 3.8), 0.08, bz);
              chunk.add(backTree);
            }
          }
        }
      }
      return;
    }

    // Deep Jungle & Bioluminescent Night Jungle trails
    const isNightJungle = kind === 'nightJungle';
    const mudTrailMat = new THREE.MeshStandardMaterial({
      map: this.textures.jeepMud,
      bumpMap: this.textures.jeepMudBump,
      bumpScale: 0.085,
      roughness: 0.88,
      metalness: 0.04,
      color: isNightJungle ? 0x6b7280 : 0xffffff,
    });
    const bankMat = new THREE.MeshStandardMaterial({
      map: this.textures.jungleGround,
      roughness: 0.95,
      color: isNightJungle ? 0x4b6a64 : 0xffffff,
    });

    addSegmentedRoad(mudTrailMat, bankMat, false);

    for (let p = 0; p < 3; p++) {
      const puddle = createJungleMudPuddle(
        1.4 + ((i + p) % 3) * 0.55,
        2.2 + ((i + p) % 2) * 1.1,
      );
      const px = isSplitBody ? (p % 2 === 0 ? -7.3 : 7.3) : ((i * 5 + p * 7) % 9) - 4.2;
      puddle.position.set(px, 0.032, -20 + p * 20);
      chunk.add(puddle);
    }

    if (seg === 'straight') {
      for (const az of [-16, 14]) {
        const arch = createJungleCanopyArch(ROAD_WIDTH - 0.6);
        arch.position.z = az;
        chunk.add(arch);
      }
    }

    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(
        new THREE.BoxGeometry(SIDEWALK_WIDTH + 2.2, 0.16, CHUNK_LENGTH),
        bankMat,
      );
      bank.position.set(side * (outerHalf + (SIDEWALK_WIDTH + 2.2) / 2), 0.05, 0);
      bank.receiveShadow = true;
      chunk.add(bank);

      for (let bz = -CHUNK_LENGTH / 2 + 5; bz < CHUNK_LENGTH / 2; bz += 10) {
        const seed = i * 23 + Math.abs(bz) * 5 + (side > 0 ? 9 : 17);

        if (isNightJungle && seed % 2 === 0) {
          const glow = createBioluminescentCluster(seed);
          glow.position.set(side * (outerHalf + 1.15), 0.1, bz - 1.2);
          chunk.add(glow);
        } else {
          const bush = createJungleUndergrowth(1.05 + (seed % 3) * 0.25);
          bush.position.set(side * (outerHalf + 1.0 + (seed % 2) * 0.45), 0.1, bz - 1.5);
          chunk.add(bush);
        }

        const tree = createJungleTree(1.15 + (seed % 4) * 0.2, seed);
        tree.position.set(side * (outerHalf + 2.6 + (seed % 3) * 0.9), 0.08, bz + 2);
        chunk.add(tree);

        if (seed % 5 === 0) {
          const ruin = createAncientRuinsBackdrop(this.textures);
          ruin.position.set(side * (outerHalf + 6.8), 0.06, bz);
          ruin.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          chunk.add(ruin);
        } else {
          const deepTree = createJungleTree(1.4 + (seed % 3) * 0.2, seed + 11);
          deepTree.position.set(side * (outerHalf + 7.2 + (seed % 3) * 1.4), 0.06, bz);
          chunk.add(deepTree);
        }
      }
    }
  }

  private getVehicleRigForType(vehicle: VehicleType): BusRig {
    if (vehicle === 'flota') return this.flotaBus;
    if (vehicle === 'taxi') return this.taxiCar;
    if (vehicle === 'jungleJeep') return this.jungleJeep;
    return this.microBus;
  }

  private syncActiveVehicleVisibility(): void {
    this.microBus.root.visible = this.vehicleType === 'micro';
    this.flotaBus.root.visible = this.vehicleType === 'flota';
    this.taxiCar.root.visible = this.vehicleType === 'taxi';
    this.jungleJeep.root.visible = this.vehicleType === 'jungleJeep';
    this.bus = this.getVehicleRigForType(this.vehicleType);
    if (this.vehicleType === 'micro' || this.vehicleType === 'flota') {
      this.bus.rearArtGroup.visible = this.cameraMode === 'chase';
    } else {
      this.bus.rearArtGroup.visible = true;
    }
  }

  private applyVehicleDecoration(): void {
    this.textures.applyDecoration(this.paintJob, this.sticker);
    const paint = getPaintJob(this.paintJob);
    const showSticker = this.sticker !== 'none';
    const rigs = [this.microBus, this.flotaBus, this.taxiCar, this.jungleJeep];
    for (const rig of rigs) {
      if (!rig) continue;
      rig.primaryMat?.color.setHex(paint.primaryHex);
      rig.secondaryMat?.color.setHex(paint.secondaryHex);
      rig.stripeMat?.color.setHex(paint.stripeHex);
      if (rig.stickerMeshes) {
        for (const sm of rig.stickerMeshes) {
          sm.visible = showSticker;
        }
      }
    }
  }

  private buildActors(): void {
    // Hero Vehicles: Micro (city), Flota (flota), Radio Taxi (taxi), 4x4 Jeep (jungle)
    this.microBus = createSantaCruzMicro(this.textures);
    this.flotaBus = createFlotaBus(this.textures);
    this.taxiCar = createPlayerTaxi(this.textures);
    this.jungleJeep = createJungleJeep(this.textures);
    this.scene.add(this.microBus.root);
    this.scene.add(this.flotaBus.root);
    this.scene.add(this.taxiCar.root);
    this.scene.add(this.jungleJeep.root);
    this.syncActiveVehicleVisibility();

    // Destination Finish Arch for Taxi Express Mode
    this.destArch = createDestinationArch(this.textures);
    this.destArch.visible = false;
    this.scene.add(this.destArch);

    // Air Horn shockwave ring
    const ringGeo = new THREE.RingGeometry(1.4, 2.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.hornWaveMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.hornWave = new THREE.Mesh(ringGeo, this.hornWaveMat);
    this.hornWave.position.y = 0.25;
    this.hornWave.visible = false;
    this.scene.add(this.hornWave);

    // Policía Boliviana Patrol Sedan
    this.police = createPoliceCar(this.textures);
    this.police.root.visible = false;
    this.scene.add(this.police.root);

    // Rival 4x4 Chaser for Jungle Jeep Mode (ambushes at 3 minutes)
    this.jungleChaser = createJungleChaser(this.textures);
    this.jungleChaser.root.visible = false;
    this.scene.add(this.jungleChaser.root);

    // Reusable Roadside Passenger Stop Zone
    const pGroup = new THREE.Group();
    const padGeo = new THREE.PlaneGeometry(4.4, 13.5);
    padGeo.rotateX(-Math.PI / 2);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.05;
    pGroup.add(pad);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.5 }),
    );
    pole.position.set(2.4, 2.1, 0);
    pGroup.add(pole);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 1.05, 1.45),
      new THREE.MeshStandardMaterial({
        color: 0x059669,
        emissive: 0x10b981,
        emissiveIntensity: 0.7,
      }),
    );
    sign.position.set(2.4, 3.8, 0);
    pGroup.add(sign);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 14, 16, 1, true), beamMat);
    beam.position.set(0, 7, 0);
    pGroup.add(beam);

    const p1 = createPedestrian(this.textures, 0xec4899, true);
    p1.root.position.set(2.8, 0.22, -1.2);
    p1.root.rotation.y = Math.PI / 2;
    pGroup.add(p1.root);

    const p2 = createPedestrian(this.textures, 0x38bdf8, true);
    p2.root.position.set(2.8, 0.22, 1.2);
    p2.root.rotation.y = Math.PI / 2;
    pGroup.add(p2.root);

    pGroup.visible = false;
    this.scene.add(pGroup);

    this.pickup = {
      active: false,
      group: pGroup,
      passengers: [p1, p2],
      padMat,
      beamMat,
      x: 5.5,
      z: -160,
      timer: 20,
      maxTimer: 20,
      progress: 0,
    };

    // Pooled particles
    const pGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    for (let i = 0; i < 48; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ mesh, active: false, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 });
    }

    // Pre-allocated zero-GC InstancedMesh weather particles (Monsoon Rain & Chaco Dust)
    const rainGeo = new THREE.BoxGeometry(0.032, 1.45, 0.032);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    });
    this.rainInstanced = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_COUNT);
    this.rainInstanced.frustumCulled = false;
    this.rainInstanced.visible = false;
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainPos[i * 3] = (Math.random() - 0.5) * 44;
      this.rainPos[i * 3 + 1] = Math.random() * 20;
      this.rainPos[i * 3 + 2] = (Math.random() - 0.5) * 58;
    }
    this.scene.add(this.rainInstanced);

    const dustGeo = new THREE.BoxGeometry(0.26, 0.16, 0.26);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    this.dustInstanced = new THREE.InstancedMesh(dustGeo, dustMat, DUST_COUNT);
    this.dustInstanced.frustumCulled = false;
    this.dustInstanced.visible = false;
    for (let i = 0; i < DUST_COUNT; i++) {
      this.dustPos[i * 3] = (Math.random() - 0.5) * 44;
      this.dustPos[i * 3 + 1] = Math.random() * 10 + 0.3;
      this.dustPos[i * 3 + 2] = (Math.random() - 0.5) * 56;
    }
    this.scene.add(this.dustInstanced);

    const snowGeo = new THREE.OctahedronGeometry(0.14, 0);
    const snowMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    });
    this.snowInstanced = new THREE.InstancedMesh(snowGeo, snowMat, SNOW_COUNT);
    this.snowInstanced.frustumCulled = false;
    this.snowInstanced.visible = false;
    for (let i = 0; i < SNOW_COUNT; i++) {
      this.snowPos[i * 3] = (Math.random() - 0.5) * 46;
      this.snowPos[i * 3 + 1] = Math.random() * 18;
      this.snowPos[i * 3 + 2] = (Math.random() - 0.5) * 58;
    }
    this.scene.add(this.snowInstanced);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
    window.addEventListener('pointerup', this.handleCanvasPointerUp);
  }

  private handleCanvasPointerDown = (e: PointerEvent): void => {
    if (e.button === 0 && this.phase === 'playing' && this.vehicleType === 'jungleJeep') {
      this.pointerFiring = true;
    }
  };

  private handleCanvasPointerUp = (): void => {
    this.pointerFiring = false;
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.virtualInput.accel = false;
    this.virtualInput.brake = false;
    this.virtualInput.left = false;
    this.virtualInput.right = false;
    this.virtualInput.boost = false;
    this.virtualInput.fire = false;
    this.pointerFiring = false;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Escape' && !e.repeat) {
      if (this.phase === 'playing') {
        this.pauseGame();
      } else if (this.phase === 'paused') {
        this.resumeGame();
      }
      return;
    }

    if (this.phase === 'title' && (e.code === 'Enter' || e.code === 'Space') && !e.repeat) {
      this.startGame();
      return;
    }

    if (this.phase === 'gameover' && e.code === 'Enter' && !e.repeat) {
      this.startGame();
      return;
    }

    if (this.phase === 'playing' && !e.repeat) {
      if (e.code === 'Space') {
        this.triggerHorn();
      } else if (e.code === 'KeyC') {
        this.toggleCameraMode();
      } else if (e.code === 'KeyR') {
        this.cycleRadioStation();
      }
    }

    this.heldKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  public setVirtualControl(
    control: 'accel' | 'brake' | 'left' | 'right' | 'boost' | 'fire',
    active: boolean,
  ): void {
    this.virtualInput[control] = active;
  }

  public toggleCameraMode(): CameraMode {
    this.cameraMode = this.cameraMode === 'chase' ? 'driver' : 'chase';
    this.sound.init();
    this.sound.playCameraToggle();
    // Hide rear panel in driver mode for enclosed buses so rear-facing camera never clips behind
    if (this.vehicleType === 'micro' || this.vehicleType === 'flota') {
      this.bus.rearArtGroup.visible = this.cameraMode === 'chase';
    }
    this.showToast(
      this.cameraMode === 'driver' ? 'DRIVER CABIN VIEW' : 'THIRD-PERSON CHASE VIEW',
      'gold',
    );
    this.emitHud(true);
    return this.cameraMode;
  }

  public cycleRadioStation(): RadioStation {
    this.sound.init();
    this.sound.setRadioActive(this.phase === 'playing');
    const next = this.sound.cycleRadioStation();
    const label =
      next === 'bollywood'
        ? 'RADIO: BOLLYWOOD RETRO'
        : next === 'techno'
          ? 'RADIO: MODERN TECHNO'
          : next === 'street'
            ? 'RADIO: STREET AMBIENT'
            : 'RADIO: OFF';
    this.showToast(label, next === 'off' ? 'gold' : next === 'techno' ? 'blue' : 'green');
    this.emitHud(true);
    return next;
  }

  public triggerHorn(): void {
    if (this.phase !== 'playing' || this.hornCooldown > 0) return;
    this.sound.init();
    this.sound.playAirHorn();
    this.hornCooldown = 0.6;

    // Expanding golden horn wave ahead of vehicle
    this.hornWave.visible = true;
    this.hornWave.position.set(this.busX, 0.25, this.busZ - 2.6);
    this.hornWave.scale.setScalar(1);
    this.hornWaveMat.opacity = 0.85;
    this.hornWaveTimer = 0.5;

    this.spawnBurst(this.busX, 1.8, this.busZ - 3.4, 0xfde047, 8, 6);

    // Scatter pedestrians, vendors, dogs, cows, and jungle caimans out of the path!
    let startledAny = false;
    for (const obs of this.obstacles) {
      if (obs.hit) continue;
      if (obs.kind === 'boulder' || obs.kind === 'fallingTree' || obs.kind === 'ruinPillar') continue;
      const dz = this.busZ - obs.z;
      const dx = obs.x - this.busX;
      if (dz > -4 && dz < 44 && Math.abs(dx) < 9.0) {
        if (!obs.startled) {
          obs.startled = true;
          obs.startleDir = obs.x >= this.busX ? 1 : -1;
          if (Math.abs(obs.x) > 3.2) {
            obs.startleDir = Math.sign(obs.x);
          }
          startledAny = true;
          this.sound.playStartle(obs.kind);
        }
      }
    }

    // Honk-Reactive AI Traffic: vehicles swerve urgently into clear lanes OR slam brakes creating chain-reaction traffic jams!
    let reactedAny = false;
    let jammedAny = false;
    for (const tr of this.traffic) {
      if (tr.knockedOut) continue;
      const dz = this.busZ - tr.z; // positive = ahead of player
      const dx = tr.x - this.busX;
      if (dz > -6 && dz < 62 && Math.abs(dx) < 4.8) {
        const pushDir = Math.abs(dx) < 0.35 ? (tr.x >= 0 ? -1 : 1) : Math.sign(dx);
        const offset = tr.kind === 'motorbike' ? 2.6 : 3.65;
        const candidates = [
          tr.x + pushDir * offset,
          tr.x - pushDir * offset,
          ...(tr.dir === -1 ? [...FORWARD_LANES] : [...OPPOSING_LANES]),
        ];

        let escapeX: number | null = null;
        for (const candX of candidates) {
          if (Math.abs(candX - this.busX) >= tr.halfW + 1.4 && this.isPathClearForPass(candX, tr)) {
            escapeX = candX;
            break;
          }
        }

        // Heavy pickups or boxed-in vehicles slam brakes & block the lane -> triggers a chain traffic jam!
        const shouldJam =
          escapeX === null || (tr.kind === 'pickup' && Math.random() < 0.45 && tr.hornReactMode !== 'brakeJam');

        if (shouldJam) {
          tr.hornReactMode = 'brakeJam';
          tr.hornReactTimer = THREE.MathUtils.randFloat(2.6, 4.2);
          tr.circumventTimer = 2.4;
          jammedAny = true;
          reactedAny = true;
          this.spawnBurst(tr.x, 0.35, tr.z + tr.halfL, 0xd4d4d8, 4, 3.2);
        } else if (escapeX !== null) {
          tr.hornReactMode = 'swerve';
          tr.hornReactTimer = 2.1;
          tr.targetX = escapeX;
          tr.circumventTimer = 2.0;
          reactedAny = true;
          this.spawnBurst(tr.x, 0.3, tr.z + tr.halfL * 0.6, 0xfef08a, 4, 3.6);
        }
      }
    }

    if (reactedAny) {
      this.sound.playTrafficHornReact(jammedAny);
    }

    if (startledAny) {
      this.score += 50;
    }
  }

  private getTaxiDestinationName(stage: number): string {
    const names = [
      'AEROPUERTO VIRU VIRU',
      'EQUIPETROL NORTE',
      'VENTURA MALL · 4º ANILLO',
      'TERMINAL BIMODAL',
      'PLAZA 24 DE SEPTIEMBRE',
    ];
    return names[(stage - 1) % names.length];
  }

  public setVehicleType(vehicle: VehicleType): void {
    if (this.vehicleType === vehicle) return;
    this.vehicleType = vehicle;
    try {
      localStorage.setItem('scz_vehicle_type', vehicle);
    } catch {
      // ignore
    }
    this.nextRealmScore = vehicle === 'taxi' ? 14000 : 10000;
    this.syncActiveVehicleVisibility();
    this.applyVehicleDecoration();
    this.bus.root.position.set(this.busX, 0, this.busZ);
    this.emitHud(true);
  }

  public setWorldType(world: WorldType): void {
    if (this.worldType === world) return;
    this.worldType = world;
    try {
      localStorage.setItem('scz_world_type', world);
    } catch {
      // ignore
    }
    this.realmIdx = 0;
    this.realmTimer = 0;
    this.exoticStage = 0;
    this.clearDynamicEntities();
    this.busX = world === 'jungle' ? 0 : 1.95;
    this.busZ = 0;
    this.bus.root.position.set(this.busX, 0, this.busZ);
    this.configureMissionLevel(1, 0);
    this.missionStopsCompleted = 0;
    this.destArch.visible = false;
    this.jungleChaserActive = false;
    this.jungleChaser.root.visible = false;
    this.buildEnvironment();
    this.recenterChunks();
    this.seedInitialWorld();
    this.emitHud(true);
  }

  public setDecoration(paintJob: PaintJobId, sticker: StickerId): void {
    this.paintJob = paintJob;
    this.sticker = sticker;
    try {
      localStorage.setItem('scz_paint_job', paintJob);
      localStorage.setItem('scz_sticker', sticker);
    } catch {
      // ignore
    }
    this.applyVehicleDecoration();
    this.emitHud(true);
  }

  public setGameMode(mode: GameMode): void {
    if (mode === 'flota') {
      this.setVehicleType('flota');
      this.setWorldType('mountain');
    } else if (mode === 'taxi') {
      this.setVehicleType('taxi');
      this.setWorldType('city');
    } else if (mode === 'jungle') {
      this.setVehicleType('jungleJeep');
      this.setWorldType('jungle');
    } else {
      this.setVehicleType('micro');
      this.setWorldType('city');
    }
  }

  private configureMissionLevel(level: number, startZ: number): void {
    this.missionLevel = level;
    this.missionCommutersPicked = 0;
    this.missionTargetCommuters = 4 + (level - 1) * 2;
    this.missionLevelStartZ = startZ;
    const nominalDist = 1620 + (level - 1) * 480;
    let targetZ = startZ - nominalDist;
    // Snap finish arch onto a unified straight road chunk (never overlapping a split fork)
    for (let tries = 0; tries < 6; tries++) {
      if (this.getRoadBoundsAtZ(targetZ).innerBarrierHalf < 0.1) break;
      targetZ -= 60;
    }
    this.missionLevelTargetZ = targetZ;
    this.missionLevelDistance = Math.max(600, Math.round(startZ - targetZ));
  }

  public startGame(): void {
    this.sound.init();
    this.sound.setRadioActive(true);
    this.clearDynamicEntities();

    this.phase = 'playing';
    this.realmIdx = 0;
    this.realmTimer = 0;
    this.exoticStage = 0;
    this.nextRealmScore = this.vehicleType === 'taxi' ? 5000 : 3500;
    this.weatherIdx = 0;
    this.weatherTimer = 0;
    this.lightningFlash = 0;
    this.thunderCooldown = 9;
    this.rainSplashTimer = 0;
    this.snowSprayTimer = 0;
    if (this.rainInstanced) this.rainInstanced.visible = false;
    if (this.dustInstanced) this.dustInstanced.visible = false;
    if (this.snowInstanced) this.snowInstanced.visible = false;
    this.syncActiveVehicleVisibility();
    this.applyVehicleDecoration();
    this.buildEnvironment();

    this.busX = this.worldType === 'jungle' ? 0 : 1.95;
    this.busZ = 0;
    this.busVx = 0;
    this.busSpeed = this.vehicleType === 'taxi' ? 22 : 16;
    this.busRoll = 0;
    this.busPitch = 0;
    this.invulnTimer = 0;
    this.hitstopTimer = 0;
    this.cameraShake = 0;

    this.health = 100;
    this.fuel = 100;
    this.fuelCollected = 0;
    this.boostersCollected = 0;
    this.activeBooster = null;
    this.activeBoosterTimer = 0;
    this.lowFuelBeepCooldown = 0;
    this.score = 0;
    this.passengersPicked = 0;
    this.combo = 1;
    this.boostCharge = 100;
    this.isBoosting = false;
    this.hornCooldown = 0;
    this.pedestrianStrikes = 0;
    this.totalPedestriansHit = 0;
    this.policeEscapes = 0;
    this.nextPickupDelay = 2.0;
    this.gameOverReason = '';

    // Bus Mission Level Objective (city & flota)
    this.configureMissionLevel(1, 0);
    this.missionStopsCompleted = 0;

    // Taxi Express state (>= 3 minutes realistic run per stage)
    this.taxiStage = 1;
    this.taxiStageDistance = 5400;
    this.taxiStageStartZ = 0;
    this.taxiElapsed = 0;
    this.taxiTimeLeft = 195;
    this.destArch.visible = false;

    // Jungle Jeep state + Machine Gun + Raiders + 3-minute Rival 4x4 Chaser
    this.jungleDistance = 0;
    this.jungleDodged = 0;
    this.jungleRunTime = 0;
    this.jungleChaserActive = false;
    this.jungleChaserCooldown = 0;
    this.jungleChaserEscapes = 0;
    this.jungleChaser.root.visible = false;
    this.gunHeat = 0;
    this.gunOverheated = false;
    this.gunFireCooldown = 0;
    this.muzzleFlashTimer = 0;
    this.obstaclesDestroyed = 0;
    this.raidersDestroyed = 0;
    this.raiderSpawnTimer = 5.5;
    this.chaserArrowTimer = 3.2;
    this.mudSlowTimer = 0;
    this.mudSoundCooldown = 0;
    this.forkChosenSide = null;
    this.forkRewardedCycle = -1;
    if (this.jungleJeep.muzzleFlash) this.jungleJeep.muzzleFlash.visible = false;

    this.policeActive = false;
    this.police.root.visible = false;
    this.pickup.active = false;
    this.pickup.group.visible = false;

    this.trafficSpawnCursorZ = -65;
    this.obstacleSpawnCursorZ = -95;
    this.trashSpawnCursorZ = -25;
    this.roadPickupSpawnCursorZ = -48;
    this.rearTrafficCooldown = 1.2;
    this.recenterChunks();
    this.seedInitialWorld();

    const startMsg =
      this.vehicleType === 'taxi'
        ? `TAXI EXPRESS — 3:15 TO REACH ${this.getTaxiDestinationName(1)}!`
        : this.vehicleType === 'jungleJeep'
          ? '4X4 ARMED JEEP — PRESS [F] / CLICK TO FIRE MG! WATCH FOR FORKS!'
          : this.vehicleType === 'flota'
            ? `FLOTA EXÓTICA — PICK UP ${this.missionTargetCommuters} COMMUTERS BEFORE TERMINAL!`
            : `MICRO LÍNEA 18 — PICK UP ${this.missionTargetCommuters} COMMUTERS AT PARADAS!`;
    this.showToast(startMsg, 'gold');
    this.emitHud(true);
  }

  public pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.pointerFiring = false;
    this.sound.setRadioActive(false);
    this.sound.updateSiren(false, 99, this.elapsed);
    this.emitHud(true);
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.lastTimestamp = performance.now();
    this.sound.setRadioActive(true);
    this.emitHud(true);
  }

  public returnToTitle(): void {
    this.clearDynamicEntities();
    this.phase = 'title';
    this.sound.setRadioActive(false);
    this.realmIdx = 0;
    this.realmTimer = 0;
    this.exoticStage = 0;
    this.nextRealmScore = this.vehicleType === 'taxi' ? 5000 : 3500;
    this.weatherIdx = 0;
    this.weatherTimer = 0;
    this.lightningFlash = 0;
    if (this.rainInstanced) this.rainInstanced.visible = false;
    if (this.dustInstanced) this.dustInstanced.visible = false;
    if (this.snowInstanced) this.snowInstanced.visible = false;
    this.cameraMode = 'chase';
    this.syncActiveVehicleVisibility();
    this.applyVehicleDecoration();
    this.buildEnvironment();
    this.busX = this.worldType === 'jungle' ? 0 : 1.95;
    this.busZ = 0;
    this.busSpeed = 14;
    this.pedestrianStrikes = 0;
    this.totalPedestriansHit = 0;
    this.gunHeat = 0;
    this.gunOverheated = false;
    this.mudSlowTimer = 0;
    this.fuel = 100;
    this.activeBooster = null;
    this.activeBoosterTimer = 0;
    this.forkChosenSide = null;
    this.forkRewardedCycle = -1;
    this.pointerFiring = false;
    this.policeActive = false;
    this.police.root.visible = false;
    this.jungleChaserActive = false;
    this.jungleChaser.root.visible = false;
    this.pickup.active = false;
    this.pickup.group.visible = false;
    this.configureMissionLevel(1, 0);
    this.missionStopsCompleted = 0;
    this.destArch.visible = false;
    this.recenterChunks();
    this.seedInitialWorld();
    this.sound.updateSiren(false, 99, this.elapsed);
    this.emitHud(true);
  }

  public toggleMute(): boolean {
    const muted = this.sound.toggleMute();
    this.emitHud(true);
    return muted;
  }

  private showToast(msg: string, tone: 'gold' | 'green' | 'red' | 'blue'): void {
    this.toastText = msg;
    this.toastTone = tone;
    this.toastTimer = 2.6;
  }

  private recenterChunks(): void {
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].position.z = 60 - i * CHUNK_LENGTH;
      this.chunks[i].userData.seqIdx = i;
      this.chunks[i].userData.segment = this.getSegmentForSeq(i);
    }
  }

  private clearDynamicEntities(): void {
    for (const tr of this.traffic) {
      this.scene.remove(tr.mesh);
    }
    this.traffic = [];

    for (const obs of this.obstacles) {
      this.scene.remove(obs.mesh);
    }
    this.obstacles = [];

    for (const t of this.trashItems) {
      this.scene.remove(t.mesh);
    }
    this.trashItems = [];

    for (const b of this.bullets) {
      this.scene.remove(b.mesh);
    }
    this.bullets = [];

    for (const a of this.arrows) {
      this.scene.remove(a.mesh);
    }
    this.arrows = [];

    for (const r of this.raiders) {
      this.scene.remove(r.mesh);
    }
    this.raiders = [];

    for (const p of this.roadPickups) {
      this.scene.remove(p.mesh);
    }
    this.roadPickups = [];
  }

  private seedInitialWorld(): void {
    this.trafficSpawnCursorZ = this.busZ - 55;
    this.obstacleSpawnCursorZ = this.busZ - 85;
    this.trashSpawnCursorZ = this.busZ - 20;
    this.roadPickupSpawnCursorZ = this.busZ - 42;

    for (let i = 0; i < 4; i++) {
      this.spawnRoadPickup();
    }

    if (this.worldType === 'jungle') {
      for (let i = 0; i < 4; i++) {
        this.spawnObstacle();
      }
      return;
    }

    for (let i = 0; i < 10; i++) {
      this.spawnTrafficWave();
    }
    for (let i = 0; i < (this.vehicleType === 'taxi' ? 2 : 4); i++) {
      this.spawnObstacle();
    }
    for (let i = 0; i < 12; i++) {
      this.spawnTrashCluster();
    }
  }

  private spawnTrashCluster(): void {
    this.trashSpawnCursorZ -= THREE.MathUtils.randFloat(12, 22);
    const z = this.trashSpawnCursorZ;
    const nearEdge = Math.random() < 0.6;
    const x = nearEdge
      ? (Math.random() < 0.5 ? -1 : 1) * THREE.MathUtils.randFloat(4.8, 7.0)
      : THREE.MathUtils.randFloat(-5.5, 5.5);

    const variant = Math.floor(Math.random() * 3);
    const mesh = createRoadTrash(this.textures, variant);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    this.trashItems.push({
      mesh,
      x,
      y: 0,
      z,
      scattered: false,
      vx: 0,
      vy: 0,
      vz: 0,
      spinX: 0,
      spinZ: 0,
    });
  }

  private spawnTrafficWave(): void {
    // Two-way Santa Cruz traffic: Left lanes (-5.85, -1.95) flow +Z (opposing),
    // Right lanes (+1.95, +5.85) flow -Z (forward), with occasional reckless wrong-way drivers!
    this.trafficSpawnCursorZ -= THREE.MathUtils.randFloat(22, 33);
    const z = this.trafficSpawnCursorZ;

    const laneIndices = [0, 1, 2, 3];
    const count = Math.random() < 0.62 ? 2 : 1;
    let spawnedWrongWay = false;

    const sedanColors = [0xdc2626, 0x2563eb, 0xe5e7eb, 0x334155, 0x059669, 0x9333ea];
    const trufiColors = [0xf8fafc, 0x38bdf8, 0xfacc15, 0xf97316];
    const pickupColors = [0x1e3a8a, 0x7f1d1d, 0xd97706, 0x475569];
    const motoColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0x18181b, 0x9333ea];

    const boundsAtSpawn = this.getRoadBoundsAtZ(z);
    const inFork = boundsAtSpawn.innerBarrierHalf > 0.25;
    const opposingSpawnLanes = inFork ? [-9.5, -5.2] : [...OPPOSING_LANES];
    const forwardSpawnLanes = inFork ? [5.2, 9.5] : [...FORWARD_LANES];

    for (let i = 0; i < count; i++) {
      const pickIdx = Math.floor(Math.random() * laneIndices.length);
      const lane = laneIndices.splice(pickIdx, 1)[0];
      const roll = Math.random();

      const baseSide: -1 | 1 = lane < 2 ? -1 : 1;
      let dir: -1 | 1 = baseSide === -1 ? 1 : -1;
      let wrongWay = false;

      // Inside a fork, left branch can carry forward traffic too so both branches feel alive!
      if (inFork && baseSide === -1 && Math.random() < 0.45) {
        dir = -1;
      }

      // Occasional wrong-way driver on either side (12% on forward side, 10% on opposing side)
      if (!spawnedWrongWay && !inFork) {
        if (baseSide === 1 && Math.random() < 0.12) {
          dir = 1; // Reckless car driving straight against forward traffic!
          wrongWay = true;
          spawnedWrongWay = true;
        } else if (baseSide === -1 && Math.random() < 0.1) {
          dir = -1; // Overtaking in the opposing lane
          wrongWay = true;
          spawnedWrongWay = true;
        }
      }

      let kind: TrafficKind = 'sedan';
      let mesh: THREE.Group;
      let speed = 14;
      let halfW = 0.9;
      let halfL = 2.15;
      let damage = 18;
      let x: number =
        baseSide === -1
          ? opposingSpawnLanes[lane]
          : forwardSpawnLanes[lane - 2];

      const isMountain = this.worldType === 'mountain';
      if (roll < 0.16) {
        kind = 'sedan';
        mesh = createSedan(
          this.textures,
          sedanColors[Math.floor(Math.random() * sedanColors.length)],
          false,
        );
        speed = THREE.MathUtils.randFloat(13.5, 18.5);
        halfW = 0.9;
        halfL = 2.18;
        damage = 18;
      } else if (roll < 0.28) {
        if (isMountain) {
          kind = 'pickup';
          mesh = createPickupTruck(
            this.textures,
            pickupColors[Math.floor(Math.random() * pickupColors.length)],
          );
          speed = THREE.MathUtils.randFloat(12.5, 17);
          halfW = 0.96;
          halfL = 2.38;
          damage = 24;
        } else {
          kind = 'taxi';
          mesh = createSedan(this.textures, 0xf8fafc, true);
          speed = THREE.MathUtils.randFloat(13, 18);
          halfW = 0.9;
          halfL = 2.18;
          damage = 18;
        }
      } else if (roll < 0.45) {
        kind = 'trufi';
        mesh = createTrufiHatchback(
          this.textures,
          trufiColors[Math.floor(Math.random() * trufiColors.length)],
          true,
        );
        speed = THREE.MathUtils.randFloat(12.5, 17.5);
        halfW = 0.85;
        halfL = 1.82;
        damage = 16;
      } else if (roll < 0.56) {
        kind = 'pickup';
        mesh = createPickupTruck(
          this.textures,
          pickupColors[Math.floor(Math.random() * pickupColors.length)],
        );
        speed = THREE.MathUtils.randFloat(12, 16.5);
        halfW = 0.96;
        halfL = 2.38;
        damage = 24;
      } else if (roll < 0.66 && !isMountain) {
        kind = 'torito';
        mesh = createTorito(this.textures, Math.random() < 0.5 ? 0xe11d48 : 0x0284c7);
        speed = THREE.MathUtils.randFloat(11.5, 15.5);
        halfW = 0.66;
        halfL = 1.3;
        damage = 14;
      } else {
        // High frequency of agile motorcycles (~34% city, ~44% Flota mountain roads)
        kind = 'motorbike';
        mesh = createMotorbike(
          this.textures,
          motoColors[Math.floor(Math.random() * motoColors.length)],
        );
        if (Math.random() < 0.55) {
          x = baseSide === -1 ? (inFork ? -7.3 : -3.9) : (inFork ? 7.3 : 3.9);
        }
        speed = THREE.MathUtils.randFloat(16.5, 23);
        halfW = 0.42;
        halfL = 1.05;
        damage = 11;
      }

      if (dir === 1) {
        mesh.rotation.y = Math.PI;
      }
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);

      this.traffic.push({
        kind,
        mesh,
        x,
        z,
        dir,
        wrongWay,
        baseSide,
        speed,
        currentSpeed: speed,
        targetX: x,
        weaveTimer: THREE.MathUtils.randFloat(1.0, 2.8),
        circumventTimer: 0,
        hornReactMode: 'none',
        hornReactTimer: 0,
        hornPitch: 0,
        halfW,
        halfL,
        damage,
        nearMissed: false,
        knockedOut: false,
        knockVx: 0,
        knockVz: 0,
        knockSpin: 0,
      });
    }
  }

  private spawnTrailingTrafficVehicle(): void {
    const z = this.busZ + THREE.MathUtils.randFloat(36, 46);
    const roll = Math.random();
    const sedanColors = [0xdc2626, 0x2563eb, 0xe5e7eb, 0x334155, 0x059669];
    const trufiColors = [0xf8fafc, 0x38bdf8, 0xfacc15, 0xf97316];
    const motoColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0x18181b];

    // Spawn behind or near the bus's lane so player sees traffic brake & circumvent!
    const rawX: number =
      Math.random() < 0.6
        ? this.busX + THREE.MathUtils.randFloat(-0.6, 0.6)
        : FORWARD_LANES[Math.floor(Math.random() * FORWARD_LANES.length)];
    const x = this.clampXToRoad(rawX, z, 1.1);

    // Ensure clear spawn gap behind existing vehicles
    for (const other of this.traffic) {
      if (Math.abs(other.z - z) < 9 && Math.abs(other.x - x) < 2.1) {
        return;
      }
    }

    let kind: TrafficKind = 'motorbike';
    let mesh: THREE.Group;
    let speed = 18;
    let halfW = 0.42;
    let halfL = 1.05;
    let damage = 11;

    if (roll < 0.38) {
      kind = 'motorbike';
      mesh = createMotorbike(this.textures, motoColors[Math.floor(Math.random() * motoColors.length)]);
      speed = THREE.MathUtils.randFloat(17, 22);
      halfW = 0.42;
      halfL = 1.05;
      damage = 11;
    } else if (roll < 0.65) {
      kind = 'trufi';
      mesh = createTrufiHatchback(
        this.textures,
        trufiColors[Math.floor(Math.random() * trufiColors.length)],
        true,
      );
      speed = THREE.MathUtils.randFloat(14, 18);
      halfW = 0.85;
      halfL = 1.82;
      damage = 16;
    } else if (roll < 0.84) {
      if (this.worldType === 'mountain') {
        kind = 'pickup';
        mesh = createPickupTruck(this.textures, 0x1e3a8a);
        speed = THREE.MathUtils.randFloat(13, 17.5);
        halfW = 0.96;
        halfL = 2.38;
        damage = 24;
      } else {
        kind = 'taxi';
        mesh = createSedan(this.textures, 0xf8fafc, true);
        speed = THREE.MathUtils.randFloat(14, 18.5);
        halfW = 0.9;
        halfL = 2.18;
        damage = 18;
      }
    } else {
      kind = 'sedan';
      mesh = createSedan(
        this.textures,
        sedanColors[Math.floor(Math.random() * sedanColors.length)],
        false,
      );
      speed = THREE.MathUtils.randFloat(14.5, 19);
      halfW = 0.9;
      halfL = 2.18;
      damage = 18;
    }

    mesh.position.set(x, 0, z);
    this.scene.add(mesh);

    this.traffic.push({
      kind,
      mesh,
      x,
      z,
      dir: -1,
      wrongWay: false,
      baseSide: 1,
      speed,
      currentSpeed: speed,
      targetX: x,
      weaveTimer: THREE.MathUtils.randFloat(1.2, 2.5),
      circumventTimer: 0,
      hornReactMode: 'none',
      hornReactTimer: 0,
      hornPitch: 0,
      halfW,
      halfL,
      damage,
      nearMissed: false,
      knockedOut: false,
      knockVx: 0,
      knockVz: 0,
      knockSpin: 0,
    });
  }

  private getRandomBranchXAtZ(z: number, margin = 1.4): number {
    const b = this.getRoadBoundsAtZ(z);
    if (b.innerBarrierHalf > 0.2) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const minX = side < 0 ? -(b.outerHalf - margin) : b.innerBarrierHalf + margin;
      const maxX = side < 0 ? -(b.innerBarrierHalf + margin) : b.outerHalf - margin;
      return THREE.MathUtils.randFloat(minX, maxX);
    }
    return THREE.MathUtils.randFloat(-(b.outerHalf - margin), b.outerHalf - margin);
  }

  private spawnJungleObstacle(): void {
    this.obstacleSpawnCursorZ -= THREE.MathUtils.randFloat(31, 46);
    const z = this.obstacleSpawnCursorZ;
    const bounds = this.getRoadBoundsAtZ(z);
    const inFork = bounds.innerBarrierHalf > 0.25;
    const roll = Math.random();

    if (roll < 0.14) {
      // 1. Cinematic Rolling Jungle Boulder (shootable)
      const branchSide = inFork ? (Math.random() < 0.5 ? -1 : 1) : 0;
      const fromRight = Math.random() < 0.5;
      const startX = inFork
        ? branchSide < 0
          ? fromRight
            ? -bounds.innerBarrierHalf - 1.2
            : -bounds.outerHalf + 1.2
          : fromRight
            ? bounds.outerHalf - 1.2
            : bounds.innerBarrierHalf + 1.2
        : fromRight
          ? ROAD_WIDTH / 2 - 0.8
          : -ROAD_WIDTH / 2 + 0.8;
      const vx = fromRight ? -THREE.MathUtils.randFloat(2.2, 3.8) : THREE.MathUtils.randFloat(2.2, 3.8);
      const mesh = createJungleBoulder(this.textures);
      mesh.position.set(startX, 0, z);
      this.scene.add(mesh);

      this.obstacles.push({
        kind: 'boulder',
        mesh,
        x: startX,
        y: 0,
        z,
        vx,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 3,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 1.08,
        halfL: 1.08,
      });
    } else if (roll < 0.28) {
      // 2. Cinematic Falling Giant Rainforest Tree (shootable)
      const edgeSide = Math.random() < 0.5 ? -1 : 1;
      const startX = inFork
        ? edgeSide * (bounds.outerHalf - 0.7)
        : edgeSide * (ROAD_WIDTH / 2 - 0.65);
      const rig = createFallingJungleTree(this.textures);
      rig.root.position.set(startX, 0, z);
      this.scene.add(rig.root);

      this.obstacles.push({
        kind: 'fallingTree',
        mesh: rig.root,
        fallingTreeRig: rig,
        x: startX,
        y: 0,
        z,
        vx: 0,
        hitX: startX - edgeSide * 3.3,
        fallTriggered: false,
        fallProgress: 0,
        fallDir: edgeSide,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 3,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 0.75,
        halfL: 0.72,
      });
    } else if (roll < 0.40) {
      // 3. Armored River Caiman Crossing (shootable or honk)
      const startX = this.getRandomBranchXAtZ(z, 1.5);
      const vx = Math.random() < 0.5 ? -1.85 : 1.85;
      const rig = createJungleCaiman(this.textures);
      rig.root.position.set(startX, 0, z);
      rig.body.rotation.y = vx > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(rig.root);

      this.obstacles.push({
        kind: 'caiman',
        mesh: rig.root,
        caimanRig: rig,
        x: startX,
        y: 0,
        z,
        vx,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 2,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: Math.random() * 6,
        halfW: 1.05,
        halfL: 0.68,
      });
    } else if (roll < 0.52) {
      // 4. Collapsing Ancient Temple Stone Totem Pillar (shootable)
      const startX = this.getRandomBranchXAtZ(z, 2.2);
      const fallDir = startX > 0 ? 1 : -1;
      const rig = createAncientRuinObstacle(this.textures);
      rig.root.position.set(startX, 0, z);
      this.scene.add(rig.root);

      this.obstacles.push({
        kind: 'ruinPillar',
        mesh: rig.root,
        ruinRig: rig,
        x: startX,
        y: 0,
        z,
        vx: 0,
        hitX: startX - fallDir * 2.2,
        fallTriggered: false,
        fallProgress: 0,
        fallDir,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 3,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 0.72,
        halfL: 0.72,
      });
    } else if (roll < 0.68) {
      // 5. Rolling Giant Timber Log (rolls across lane / down trail, shootable!)
      const startX = this.getRandomBranchXAtZ(z, 1.8);
      const vx = (startX > 0 ? -1 : 1) * THREE.MathUtils.randFloat(1.6, 2.8);
      const mesh = createRollingLog(this.textures);
      mesh.position.set(startX, 0, z);
      this.scene.add(mesh);

      this.obstacles.push({
        kind: 'rollingLog',
        mesh,
        x: startX,
        y: 0,
        z,
        vx,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 2,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 1.5,
        halfL: 0.75,
      });
    } else if (roll < 0.79) {
      // 6. Rusted Broken-Down Jungle Expedition Car (shootable!)
      const startX = this.getRandomBranchXAtZ(z, 1.8);
      const mesh = createWreckedCar(this.textures, true);
      mesh.position.set(startX, 0, z);
      this.scene.add(mesh);

      this.obstacles.push({
        kind: 'wreckedCar',
        mesh,
        x: startX,
        y: 0,
        z,
        vx: 0,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 4,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 1.0,
        halfL: 2.15,
      });
    } else if (roll < 0.90) {
      // 7. Deep Mud Bog (slows Jeep & splashes mud!)
      const startX = this.getRandomBranchXAtZ(z, 2.1);
      const mesh = createMudPit(this.textures, false);
      mesh.position.set(startX, 0, z);
      this.scene.add(mesh);

      this.obstacles.push({
        kind: 'mudPit',
        mesh,
        x: startX,
        y: 0,
        z,
        vx: 0,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: false,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 1.95,
        halfL: 2.5,
      });
    } else {
      // 8. Spiked Tribal Log Barricade (shootable!)
      const startX = this.getRandomBranchXAtZ(z, 1.8);
      const mesh = createBarricade(this.textures, true);
      mesh.position.set(startX, 0, z);
      this.scene.add(mesh);

      this.obstacles.push({
        kind: 'barricade',
        mesh,
        x: startX,
        y: 0,
        z,
        vx: 0,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 2,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 1.35,
        halfL: 0.65,
      });
    }
  }

  private spawnObstacle(): void {
    if (this.worldType === 'jungle') {
      this.spawnJungleObstacle();
      return;
    }

    this.obstacleSpawnCursorZ -= THREE.MathUtils.randFloat(
      this.vehicleType === 'taxi' ? 40 : 30,
      this.vehicleType === 'taxi' ? 62 : 48,
    );
    const z = this.obstacleSpawnCursorZ;
    const roll = Math.random();

    // Diverse road obstacles tailored for Mountain, City, and high-speed runs
    if (roll < 0.12) {
      // Broken-down car with blinking hazard lights (shootable by Jeep MG)
      const startX = this.getRandomBranchXAtZ(z, 1.7);
      const mesh = createWreckedCar(this.textures, false);
      mesh.position.set(startX, 0, z);
      this.scene.add(mesh);

      this.obstacles.push({
        kind: 'wreckedCar',
        mesh,
        x: startX,
        y: 0,
        z,
        vx: 0,
        startled: false,
        startleDir: 1,
        hit: false,
        shootable: true,
        hp: 4,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 0.98,
        halfL: 2.1,
      });
      return;
    }

    if (roll < 0.23) {
      // Mud Pit / Street Oil & Water Slick (slows vehicle & splashes!)
      const startX = this.getRandomBranchXAtZ(z, 2.0);
      const mesh = createMudPit(this.textures, this.worldType !== 'mountain');
      mesh.position.set(startX, 0, z);
      this.scene.add(mesh);

      this.obstacles.push({
        kind: 'mudPit',
        mesh,
        x: startX,
        y: 0,
        z,
        vx: 0,
        startled: false,
        startleDir: 1,
        hit: false,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: 0,
        halfW: 1.85,
        halfL: 2.35,
      });
      return;
    }

    if (roll < 0.34) {
      if (this.worldType === 'mountain') {
        // Rolling timber log or boulder on steep mountain/jungle dirt roads
        if (Math.random() < 0.55) {
          const startX = this.getRandomBranchXAtZ(z, 1.8);
          const vx = (startX > 0 ? -1 : 1) * 2.0;
          const mesh = createRollingLog(this.textures);
          mesh.position.set(startX, 0, z);
          this.scene.add(mesh);

          this.obstacles.push({
            kind: 'rollingLog',
            mesh,
            x: startX,
            y: 0,
            z,
            vx,
            startled: false,
            startleDir: 1,
            hit: false,
            shootable: true,
            hp: 2,
            knockVx: 0,
            knockVy: 0,
            knockVz: 0,
            animPhase: 0,
            halfW: 1.5,
            halfL: 0.75,
          });
        } else {
          const startX = this.getRandomBranchXAtZ(z, 1.4);
          const vx = (startX > 0 ? -1 : 1) * 2.4;
          const mesh = createJungleBoulder(this.textures);
          mesh.position.set(startX, 0, z);
          this.scene.add(mesh);

          this.obstacles.push({
            kind: 'boulder',
            mesh,
            x: startX,
            y: 0,
            z,
            vx,
            startled: false,
            startleDir: 1,
            hit: false,
            shootable: true,
            hp: 3,
            knockVx: 0,
            knockVy: 0,
            knockVz: 0,
            animPhase: 0,
            halfW: 1.05,
            halfL: 1.05,
          });
        }
      } else {
        // Urban roadwork barricade (shootable by Jeep MG)
        const startX = this.getRandomBranchXAtZ(z, 1.7);
        const mesh = createBarricade(this.textures, false);
        mesh.position.set(startX, 0, z);
        this.scene.add(mesh);

        this.obstacles.push({
          kind: 'barricade',
          mesh,
          x: startX,
          y: 0,
          z,
          vx: 0,
          startled: false,
          startleDir: 1,
          hit: false,
          shootable: true,
          hp: 2,
          knockVx: 0,
          knockVy: 0,
          knockVz: 0,
          animPhase: 0,
          halfW: 1.25,
          halfL: 0.6,
        });
      }
      return;
    }

    if (roll < 0.50) {
      // Wandering cow / livestock near outer lanes
      const lane = this.getRandomBranchXAtZ(z, 1.6);
      const rig = createCow(this.textures, Math.random() < 0.55);
      const vx = Math.random() < 0.4 ? 0 : Math.random() < 0.5 ? -0.85 : 0.85;
      rig.root.position.set(lane, 0, z);
      rig.root.rotation.y = vx === 0 ? (Math.random() - 0.5) * 0.8 : vx > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(rig.root);

      this.obstacles.push({
        kind: 'cow',
        mesh: rig.root,
        cowRig: rig,
        x: lane,
        y: 0,
        z,
        vx,
        startled: false,
        startleDir: 1,
        hit: false,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: Math.random() * 6,
        halfW: 0.65,
        halfL: 0.85,
      });
    } else if (roll < 0.68 && this.worldType === 'city') {
      // Street vendor pushing a colorful carrito (city world only)
      const startX = this.getRandomBranchXAtZ(z, 1.5);
      const vx = startX >= 0 ? -1.4 : 1.4;
      const cartColors = [0xea580c, 0x0284c7, 0x16a34a, 0xe11d48];
      const rig = createVendorCart(
        this.textures,
        cartColors[Math.floor(Math.random() * cartColors.length)],
      );
      rig.root.position.set(startX, 0, z);
      rig.root.rotation.y = vx > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(rig.root);

      this.obstacles.push({
        kind: 'vendor',
        mesh: rig.root,
        vendorRig: rig,
        x: startX,
        y: 0,
        z,
        vx,
        startled: false,
        startleDir: 1,
        hit: false,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: Math.random() * 6,
        halfW: 0.65,
        halfL: 0.8,
      });
    } else if (roll < 0.83) {
      // Stray street dog darting across lanes
      const startX = this.getRandomBranchXAtZ(z, 1.2);
      const vx = startX >= 0 ? -3.1 : 3.1;
      const dogCoats = [0xc27838, 0x78350f, 0xd6d3d1, 0x451a03];
      const rig = createDog(this.textures, dogCoats[Math.floor(Math.random() * dogCoats.length)]);
      rig.root.position.set(startX, 0, z);
      rig.root.rotation.y = vx > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(rig.root);

      this.obstacles.push({
        kind: 'dog',
        mesh: rig.root,
        dogRig: rig,
        x: startX,
        y: 0,
        z,
        vx,
        startled: false,
        startleDir: 1,
        hit: false,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: Math.random() * 6,
        halfW: 0.35,
        halfL: 0.45,
      });
    } else {
      // Jaywalking pedestrian crossing unpredictably
      const startX = this.getRandomBranchXAtZ(z, 1.2);
      const vx = startX >= 0 ? -2.45 : 2.45;
      const shirtPalette = [0xf43f5e, 0x3b82f6, 0xfacc15, 0xa855f7, 0x10b981];
      const rig = createPedestrian(
        this.textures,
        shirtPalette[Math.floor(Math.random() * shirtPalette.length)],
      );
      rig.root.position.set(startX, 0, z);
      rig.root.rotation.y = vx > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(rig.root);

      this.obstacles.push({
        kind: 'pedestrian',
        mesh: rig.root,
        pedRig: rig,
        x: startX,
        y: 0,
        z,
        vx,
        startled: false,
        startleDir: 1,
        hit: false,
        knockVx: 0,
        knockVy: 0,
        knockVz: 0,
        animPhase: Math.random() * 6,
        halfW: 0.4,
        halfL: 0.4,
      });
    }
  }

  private spawnPickupZone(): void {
    const distToTerminal = this.busZ - this.missionLevelTargetZ;
    // Do not spawn a new stop too close to or past the level terminal arch
    if (distToTerminal < 150) {
      return;
    }

    let targetZ = this.busZ - THREE.MathUtils.randFloat(155, 205);
    const minStopZ = this.missionLevelTargetZ + 95;
    if (targetZ < minStopZ) {
      targetZ = minStopZ;
    }

    // Ensure roadside pickup stop spawns on a unified straight avenue segment
    for (let tries = 0; tries < 6; tries++) {
      if (this.getRoadBoundsAtZ(targetZ).innerBarrierHalf < 0.1) break;
      if (targetZ - 65 >= minStopZ) {
        targetZ -= 65;
      } else {
        targetZ += 55;
      }
    }

    if (targetZ > this.busZ - 85 || targetZ < this.missionLevelTargetZ + 65) {
      return;
    }

    this.pickup.active = true;
    this.pickup.x = 5.5; // Right curb lane
    this.pickup.z = targetZ;
    this.pickup.maxTimer = Math.max(14, 22 - this.passengersPicked * 0.25);
    this.pickup.timer = this.pickup.maxTimer;
    this.pickup.progress = 0;

    this.pickup.group.position.set(this.pickup.x, 0, this.pickup.z);
    this.pickup.group.visible = true;
  }

  private startPolicePursuit(): void {
    this.policeActive = true;
    this.policeMaxTimer = 18;
    this.policeTimer = 18;
    this.policeZ = this.busZ + 34;
    this.policeX = this.busX;
    this.policeSpeed = Math.min(29.5, Math.max(this.busSpeed + 3, 24));
    this.police.root.position.set(this.policeX, 0, this.policeZ);
    this.police.root.visible = true;

    this.sound.playPoliceAlert();
    this.showToast('POLICÍA BOLIVIANA PURSUIT! OUTMANEUVER & ESCAPE!', 'blue');
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count: number, spread: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = THREE.MathUtils.randFloat(0.35, 0.75);
      p.vx = (Math.random() - 0.5) * spread;
      p.vy = THREE.MathUtils.randFloat(2.5, spread * 0.9);
      p.vz = (Math.random() - 0.5) * spread;
      p.mesh.position.set(x, y, z);
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  private triggerGameOver(reason: string): void {
    this.phase = 'gameover';
    this.gameOverReason = reason;
    this.cameraShake = 1.0;
    this.hitstopTimer = 0.07;
    this.sound.setRadioActive(false);
    this.sound.playGameOver();
    this.sound.updateSiren(false, 99, this.elapsed);

    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      try {
        localStorage.setItem('scz_micro_high_score', String(this.highScore));
      } catch {
        // ignore
      }
    }
    this.emitHud(true);
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.disposed) this.tick();
      });
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const poll = () => {
      if (this.disposed) return;
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick(): void {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = Math.min((now - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = now;

    if (this.phase === 'title') {
      this.elapsed += rawDt;
      this.updateTitleShowcase(rawDt);
    } else if (this.phase === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= rawDt;
      } else {
        this.elapsed += rawDt;
        this.updatePlaying(rawDt);
      }
    }

    this.updateParticles(rawDt);
    this.skyDome.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  private updateTitleShowcase(dt: number): void {
    this.busSpeed = 14;
    this.busZ -= this.busSpeed * dt;
    this.busX = (this.worldType === 'jungle' ? 0 : 1.95) + Math.sin(this.elapsed * 0.45) * 1.4;
    this.bus.root.position.set(this.busX, 0, this.busZ);
    this.bus.bodyTilt.rotation.z = -Math.cos(this.elapsed * 0.45) * 0.03;

    for (const w of this.bus.wheels) {
      w.rotation.x -= (this.busSpeed * dt) / 0.45;
    }

    this.recycleChunks();
    this.updateSunFollow();
    this.updateRoadPickups(dt, false);
    if (this.worldType === 'jungle') {
      this.updateObstacles(dt, false);
    } else {
      this.updateTraffic(dt, false);
      this.updateTrash(dt, false);
    }

    const orbit = Math.sin(this.elapsed * 0.35) * 3.4;
    _vec3A.set(this.busX + orbit + 1.1, 3.65 + Math.sin(this.elapsed * 0.5) * 0.35, this.busZ + 8.4);
    this.camera.position.lerp(_vec3A, 1 - Math.exp(-3 * dt));
    _vec3B.set(this.busX - 1.35, 1.65, this.busZ - 3.8);
    this.camera.lookAt(_vec3B);
  }

  private updatePlaying(dt: number): void {
    if (this.hornCooldown > 0) this.hornCooldown = Math.max(0, this.hornCooldown - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.6);
    if (this.mudSlowTimer > 0) this.mudSlowTimer = Math.max(0, this.mudSlowTimer - dt);
    if (this.mudSoundCooldown > 0) this.mudSoundCooldown = Math.max(0, this.mudSoundCooldown - dt);
    if (this.lowFuelBeepCooldown > 0) this.lowFuelBeepCooldown = Math.max(0, this.lowFuelBeepCooldown - dt);
    if (this.activeBoosterTimer > 0) {
      this.activeBoosterTimer = Math.max(0, this.activeBoosterTimer - dt);
      if (this.activeBoosterTimer <= 0) {
        this.activeBooster = null;
      }
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastText = null;
    }

    const hasFuel = this.fuel > 0;
    const nitroOverdrive = this.activeBooster === 'nitro';
    const accelInput = this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp') || this.virtualInput.accel;
    const accel = hasFuel && accelInput;
    const brake = this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown') || this.virtualInput.brake;
    const left = this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft') || this.virtualInput.left;
    const right = this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight') || this.virtualInput.right;
    const wantBoost = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight') || this.virtualInput.boost;

    this.isBoosting = hasFuel && ((wantBoost && this.boostCharge > 2) || nitroOverdrive) && !brake;
    if (this.isBoosting && !nitroOverdrive) {
      this.boostCharge = Math.max(0, this.boostCharge - 26 * dt);
    } else {
      this.boostCharge = Math.min(100, this.boostCharge + (nitroOverdrive ? 18 : 8) * dt);
    }

    const weather = this.getActiveWeather();
    const mudFactor = this.mudSlowTimer > 0 ? 0.68 : 1.0;
    const weatherSpeedFactor =
      weather === 'blizzard'
        ? 0.87
        : weather === 'monsoon'
          ? 0.91
          : weather === 'heavyRain'
            ? 0.94
            : weather === 'dusty'
              ? 0.96
              : 1.0;
    const brakeGripFactor =
      weather === 'blizzard'
        ? 0.48
        : weather === 'monsoon'
          ? 0.6
          : weather === 'heavyRain'
            ? 0.74
            : weather === 'dusty'
              ? 0.88
              : 1.0;
    const steerGripDamp =
      weather === 'blizzard'
        ? 0.4
        : weather === 'monsoon'
          ? 0.48
          : weather === 'heavyRain'
            ? 0.6
            : weather === 'dusty'
              ? 0.72
              : 1.0;

    const normalMax =
      (this.vehicleType === 'taxi' ? 43.5 : this.vehicleType === 'jungleJeep' ? 37.5 : 33.5) *
      mudFactor *
      weatherSpeedFactor;
    const boostBase = this.vehicleType === 'taxi' ? 55.5 : this.vehicleType === 'jungleJeep' ? 47.5 : 43;
    const boostMax = boostBase * (nitroOverdrive ? 1.14 : 1.0) * mudFactor * weatherSpeedFactor;
    const maxSpeed = this.isBoosting ? boostMax : normalMax;
    const minSpeed = 0;

    if (!hasFuel) {
      this.busSpeed = THREE.MathUtils.damp(this.busSpeed, 0, brake ? 6.0 * brakeGripFactor : 2.1, dt);
      if (this.busSpeed <= 1.2) {
        this.triggerGameOver(
          'Out of fuel! Collect red fuel cans along the road to keep your tank full.',
        );
        return;
      }
    } else if (brake) {
      this.busSpeed = Math.max(
        minSpeed,
        this.busSpeed - (this.vehicleType === 'taxi' ? 34 : 28) * brakeGripFactor * dt,
      );
    } else if (accel || this.isBoosting) {
      const basePush = this.vehicleType === 'taxi' ? 21 : this.vehicleType === 'jungleJeep' ? 18 : 15.5;
      const push = this.isBoosting ? basePush * (nitroOverdrive ? 1.85 : 1.55) : basePush;
      this.busSpeed = Math.min(maxSpeed, this.busSpeed + push * dt);
    } else if (this.busSpeed < 1.8) {
      // Stay cleanly stopped when player braked to a halt
      this.busSpeed = THREE.MathUtils.damp(this.busSpeed, 0, 4.0, dt);
      if (this.busSpeed < 0.08) this.busSpeed = 0;
    } else {
      this.busSpeed = THREE.MathUtils.damp(
        this.busSpeed,
        this.vehicleType === 'taxi' ? 19.5 : 14.5,
        1.3,
        dt,
      );
    }
    if (this.mudSlowTimer > 0 && this.busSpeed > maxSpeed) {
      this.busSpeed = THREE.MathUtils.damp(this.busSpeed, maxSpeed, 4.5, dt);
    }

    // Consume fuel proportional to driving speed (Nitro booster saves fuel while active!)
    if (hasFuel && this.busSpeed > 0.5 && !nitroOverdrive) {
      const speedRatio = this.busSpeed / Math.max(1, normalMax);
      const burnPerSec = 0.52 + speedRatio * 0.72 + (this.isBoosting ? 0.5 : 0);
      this.fuel = Math.max(0, this.fuel - burnPerSec * dt);
    }
    if (this.fuel > 0 && this.fuel <= 20 && this.lowFuelBeepCooldown <= 0) {
      this.lowFuelBeepCooldown = 2.6;
      this.sound.playLowFuelBeep();
    }

    const steerDir = (right ? 1 : 0) - (left ? 1 : 0);
    const speedSteerScale = THREE.MathUtils.clamp(this.busSpeed / 4.0, 0, 1);
    const steerBase = this.vehicleType === 'taxi' ? 10.2 : this.vehicleType === 'jungleJeep' ? 9.0 : 7.8;
    const steerResponsiveness = (steerBase + (this.busSpeed / Math.max(1, normalMax)) * 5.6) * speedSteerScale;
    const windWeight = this.vehicleType === 'taxi' || this.vehicleType === 'jungleJeep' ? 0.65 : 1.05;
    const crosswindDrift =
      weather === 'blizzard' && this.busSpeed > 4
        ? Math.sin(this.elapsed * 1.8) * 1.95 * windWeight
        : weather === 'dusty' && this.busSpeed > 4
          ? Math.sin(this.elapsed * 1.35) * 1.4 * windWeight
          : weather === 'monsoon' && this.busSpeed > 8
            ? Math.sin(this.elapsed * 2.1) * 0.95 * windWeight
            : weather === 'heavyRain' && this.busSpeed > 10
              ? Math.sin(this.elapsed * 1.7) * 0.5 * windWeight
              : 0;
    const targetVx = steerDir * steerResponsiveness + crosswindDrift;
    const baseDamp = this.vehicleType === 'taxi' ? 11.5 : 9.2;
    this.busVx = THREE.MathUtils.damp(this.busVx, targetVx, baseDamp * steerGripDamp, dt);

    this.busZ -= this.busSpeed * dt;
    this.busX += this.busVx * dt;

    // Clamp to outer shoulders AND central fork divider island when inside a split path
    const roadBounds = this.getRoadBoundsAtZ(this.busZ);
    const margin = this.vehicleType === 'taxi' ? 1.1 : 1.35;
    const maxEdge = roadBounds.outerHalf - margin;
    if (this.busX < -maxEdge) {
      this.busX = -maxEdge;
      this.busVx = Math.max(0, this.busVx * -0.2);
    } else if (this.busX > maxEdge) {
      this.busX = maxEdge;
      this.busVx = Math.min(0, this.busVx * -0.2);
    }
    if (roadBounds.innerBarrierHalf > 0.08) {
      const minInner = roadBounds.innerBarrierHalf + margin;
      if (Math.abs(this.busX) < minInner) {
        const pushSide = this.busX < 0 ? -1 : 1;
        this.busX = pushSide * minInner;
        this.busVx = pushSide * Math.max(1.5, Math.abs(this.busVx) * 0.35);
      }
    }

    const rollScale =
      weather === 'blizzard'
        ? 1.42
        : weather === 'monsoon'
          ? 1.34
          : weather === 'heavyRain'
            ? 1.22
            : weather === 'dusty'
              ? 1.15
              : 1.0;
    const targetRoll = -this.busVx * (this.vehicleType === 'taxi' ? 0.008 : 0.011) * rollScale;
    const targetPitch = brake && this.busSpeed > 0.3 ? -0.03 : accel || this.isBoosting ? 0.018 : 0;
    this.busRoll = THREE.MathUtils.damp(this.busRoll, targetRoll, 10, dt);
    this.busPitch = THREE.MathUtils.damp(this.busPitch, targetPitch, 10, dt);

    this.bus.root.position.set(this.busX, 0, this.busZ);
    this.bus.root.rotation.y = -this.busVx * 0.014;
    this.bus.bodyTilt.rotation.z = this.busRoll;
    this.bus.bodyTilt.rotation.x = this.busPitch;

    // Turn the interior steering wheel for First-Person Driver View!
    this.bus.steeringWheel.rotation.z = THREE.MathUtils.damp(
      this.bus.steeringWheel.rotation.z,
      -this.busVx * 0.14,
      12,
      dt,
    );

    this.bus.bodyTilt.visible = this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 18) % 2 === 0;
    this.bus.brakeLights.emissiveIntensity = brake || this.busSpeed < 1.2 ? 2.8 : 0.75;

    for (const w of this.bus.wheels) {
      w.rotation.x -= (this.busSpeed * dt) / 0.45;
    }

    // Subtle exhaust puffs when accelerating or boosting + dirt/mud dust in Mountain & Jungle worlds
    if (accel || this.isBoosting) {
      this.exhaustTimer -= dt;
      if (this.exhaustTimer <= 0) {
        this.exhaustTimer = this.isBoosting ? 0.06 : 0.14;
        const zTail =
          this.vehicleType === 'flota'
            ? 4.2
            : this.vehicleType === 'taxi' || this.vehicleType === 'jungleJeep'
              ? 2.5
              : 3.7;
        this.spawnBurst(
          this.busX - 0.65,
          0.36,
          this.busZ + zTail,
          this.isBoosting ? 0x38bdf8 : 0x9ca3af,
          1,
          2.2,
        );
      }
    }

    if (
      (this.worldType === 'mountain' || this.worldType === 'jungle' || this.mudSlowTimer > 0) &&
      this.busSpeed > 6
    ) {
      this.dirtDustTimer -= dt;
      if (this.dirtDustTimer <= 0) {
        this.dirtDustTimer = this.mudSlowTimer > 0 ? 0.045 : 0.085;
        const dustColor =
          this.mudSlowTimer > 0 ? 0x451a03 : this.worldType === 'jungle' ? 0x6b4c2e : 0xb48454;
        const zOff = this.vehicleType === 'flota' ? 3.2 : 1.9;
        for (const sx of [-0.95, 0.95]) {
          this.spawnBurst(this.busX + sx, 0.25, this.busZ + zOff, dustColor, 1, 2.9);
        }
      }
    }

    if (this.hornWaveTimer > 0) {
      this.hornWaveTimer -= dt;
      const p = 1 - this.hornWaveTimer / 0.5;
      this.hornWave.position.set(this.busX, 0.25, this.busZ - 2.6 - p * 12);
      this.hornWave.scale.setScalar(1 + p * 7.5);
      this.hornWaveMat.opacity = (1 - p) * 0.85;
      if (this.hornWaveTimer <= 0) {
        this.hornWave.visible = false;
      }
    }

    this.score += this.busSpeed * dt * (this.vehicleType === 'taxi' ? 2.1 : 1.6) * this.combo;
    if (this.worldType === 'jungle' || this.vehicleType === 'jungleJeep') {
      this.jungleDistance = Math.round(Math.abs(this.busZ));
      this.jungleRunTime += dt;
    }

    this.updateForkProgression(roadBounds);
    this.updateRealmProgression(dt);
    this.updateWeatherProgression(dt);
    this.updateRealmTransition(dt);
    this.updateWeatherVisuals(dt);
    this.recycleChunks();
    this.updateSunFollow();
    this.updateRoadPickups(dt, true);

    if (this.vehicleType === 'jungleJeep') {
      this.updateWeaponsAndCombat(dt);
    }

    if (this.worldType !== 'jungle') {
      this.updateTraffic(dt, true);
      this.updateTrash(dt, true);
    } else {
      this.updateRaiders(dt);
      this.updateArrows(dt);
    }
    this.updateObstacles(dt, true);

    if (this.vehicleType === 'micro' || this.vehicleType === 'flota') {
      this.updatePickupZone(dt);
      this.updateMissionProgress();
    } else if (this.vehicleType === 'taxi') {
      this.updateTaxiDestination(dt);
    }

    if (this.worldType === 'jungle') {
      this.updateJungleChaser(dt);
    } else {
      this.updatePolicePursuit(dt);
    }

    // Camera positioning: Toggle seamlessly between Chase View & First-Person Driver View
    const speedNorm = THREE.MathUtils.clamp(this.busSpeed / boostMax, 0, 1);
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.65;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.5;

    if (this.cameraMode === 'driver') {
      const targetFov = 68 + speedNorm * 12 + (this.isBoosting ? 5 : 0);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();

      const eyeX = this.vehicleType === 'taxi' ? -0.42 : this.vehicleType === 'jungleJeep' ? -0.44 : -0.54;
      const eyeY =
        this.vehicleType === 'flota'
          ? 2.58
          : this.vehicleType === 'taxi'
            ? 1.18
            : this.vehicleType === 'jungleJeep'
              ? 1.54
              : 2.14;
      const eyeZ =
        this.vehicleType === 'flota'
          ? -2.85
          : this.vehicleType === 'taxi'
            ? -0.34
            : this.vehicleType === 'jungleJeep'
              ? -0.22
              : -2.15;

      this.camera.position.set(
        this.busX + eyeX + shakeX * 0.35,
        eyeY + shakeY * 0.35 + this.busPitch * 1.4,
        this.busZ + eyeZ,
      );
      _vec3B.set(
        this.busX + eyeX + this.busVx * 0.22,
        eyeY - 0.26 + this.busPitch * 8,
        this.busZ - 28,
      );
      this.camera.lookAt(_vec3B);
    } else {
      const targetFov = 58 + speedNorm * 14 + (this.isBoosting ? 6 : 0);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();

      const camY =
        this.vehicleType === 'flota'
          ? 5.25
          : this.vehicleType === 'taxi'
            ? 3.25
            : this.vehicleType === 'jungleJeep'
              ? 3.65
              : 4.7;
      const camZOff =
        this.vehicleType === 'flota'
          ? 10.6
          : this.vehicleType === 'taxi'
            ? 7.4
            : this.vehicleType === 'jungleJeep'
              ? 8.0
              : 9.4;

      _vec3A.set(this.busX * 0.82 + shakeX, camY + shakeY, this.busZ + camZOff + speedNorm * 1.5);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _vec3A.x, 8.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _vec3A.y, 8.5, dt);
      this.camera.position.z = _vec3A.z;

      const lookY = this.vehicleType === 'taxi' ? 1.15 : this.vehicleType === 'jungleJeep' ? 1.45 : 1.9;
      _vec3B.set(this.busX * 0.9, lookY, this.busZ - 11);
      this.camera.lookAt(_vec3B);
    }

    // Update clean siren / pursuit alert audio (zero continuous engine drone!)
    const sirenActive = this.policeActive || this.jungleChaserActive;
    const chaseDist = this.jungleChaserActive
      ? Math.abs(this.jungleChaserZ - this.busZ)
      : this.policeActive
        ? Math.abs(this.policeZ - this.busZ)
        : 99;
    this.sound.updateSiren(sirenActive, chaseDist, this.elapsed);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.04) {
      this.hudSyncTimer = 0;
      this.emitHud(false);
    }
  }

  private updateForkProgression(bounds: {
    segment: ChunkSegment;
    seq: number;
    t: number;
    innerBarrierHalf: number;
  }): void {
    const { segment, seq, t } = bounds;
    const isInsideFork =
      segment === 'split_body' ||
      (segment === 'split_entry' && t > 0.65) ||
      (segment === 'split_exit' && t < 0.35);

    if (isInsideFork) {
      this.forkChosenSide = this.busX < 0 ? 'left' : 'right';
    } else if (segment === 'split_exit' && t >= 0.35) {
      const cycle = this.getForkCycleForSeq(seq);
      if (cycle >= 0 && this.forkRewardedCycle !== cycle) {
        this.forkRewardedCycle = cycle;
        const side = this.forkChosenSide ?? (this.busX < 0 ? 'left' : 'right');
        const cfg = FORK_CONFIGS[this.worldType];
        const pathName = side === 'left' ? cfg.leftLabel : cfg.rightLabel;
        let bonusDesc = side === 'left' ? cfg.leftBonus : cfg.rightBonus;

        if (this.vehicleType === 'taxi') {
          if (side === 'left') {
            this.taxiStageStartZ += 150;
            this.score += 600;
            bonusDesc = '-150M GAIN · +600 PTS';
          } else {
            this.taxiTimeLeft += 8;
            this.score += 500;
            bonusDesc = '+8S TIME · +500 PTS';
          }
        } else if (this.worldType === 'city') {
          if (side === 'left') {
            this.score += 800;
            this.boostCharge = Math.min(100, this.boostCharge + 20);
          } else {
            this.score += 650;
            this.health = Math.min(this.maxHealth, this.health + 15);
          }
        } else if (this.worldType === 'mountain') {
          if (side === 'left') {
            this.score += 900;
            this.boostCharge = Math.min(100, this.boostCharge + 25);
          } else {
            this.score += 700;
            this.health = Math.min(this.maxHealth, this.health + 15);
          }
        } else {
          if (side === 'left') {
            this.score += 1000;
            this.boostCharge = Math.min(100, this.boostCharge + 25);
          } else {
            this.score += 800;
            this.health = Math.min(this.maxHealth, this.health + 15);
          }
        }

        if (this.vehicleType === 'jungleJeep') {
          this.gunHeat = 0;
          this.gunOverheated = false;
        }

        this.sound.playForkMerge();
        this.spawnBurst(this.busX, 1.8, this.busZ - 2, 0xfde047, 14, 8);
        this.showToast(`${pathName} MERGED! ${bonusDesc}`, 'green');
      }
      this.forkChosenSide = null;
    } else if (segment === 'straight') {
      this.forkChosenSide = null;
    }
  }

  private getForkHudInfo(): {
    forkActive: boolean;
    forkPhase: 'none' | 'approaching' | 'inside';
    forkDistance: number;
    forkLeftLabel: string;
    forkRightLabel: string;
    forkLeftBonus: string;
    forkRightBonus: string;
    forkChosenSide: 'left' | 'right' | null;
  } {
    const cfg = FORK_CONFIGS[this.worldType];
    const leftBonus = this.vehicleType === 'taxi' ? '-150M GAIN · +600 PTS' : cfg.leftBonus;
    const rightBonus = this.vehicleType === 'taxi' ? '+8S TIME · +500 PTS' : cfg.rightBonus;
    const cur = this.getRoadBoundsAtZ(this.busZ);
    const inFork =
      cur.segment === 'split_body' ||
      (cur.segment === 'split_entry' && cur.t > 0.65) ||
      (cur.segment === 'split_exit' && cur.t < 0.35);

    if (inFork) {
      const cycle = this.getForkCycleForSeq(cur.seq);
      const mergeSeq = 6 + cycle * 8 + 3;
      const mergeWorldZ = 60 - mergeSeq * CHUNK_LENGTH + 10;
      const distToMerge = Math.max(0, Math.round(this.busZ - mergeWorldZ));
      return {
        forkActive: true,
        forkPhase: 'inside',
        forkDistance: distToMerge,
        forkLeftLabel: cfg.leftLabel,
        forkRightLabel: cfg.rightLabel,
        forkLeftBonus: leftBonus,
        forkRightBonus: rightBonus,
        forkChosenSide: this.busX < 0 ? 'left' : 'right',
      };
    }

    // Look ahead up to 170m for an upcoming fork split
    for (let ahead = 10; ahead <= 170; ahead += 15) {
      const probe = this.getRoadBoundsAtZ(this.busZ - ahead);
      if (probe.segment === 'split_entry') {
        const splitNoseZ = 60 - probe.seq * CHUNK_LENGTH - 10;
        const dist = Math.max(0, Math.round(this.busZ - splitNoseZ));
        return {
          forkActive: true,
          forkPhase: 'approaching',
          forkDistance: dist,
          forkLeftLabel: cfg.leftLabel,
          forkRightLabel: cfg.rightLabel,
          forkLeftBonus: leftBonus,
          forkRightBonus: rightBonus,
          forkChosenSide: null,
        };
      }
    }

    return {
      forkActive: false,
      forkPhase: 'none',
      forkDistance: 0,
      forkLeftLabel: cfg.leftLabel,
      forkRightLabel: cfg.rightLabel,
      forkLeftBonus: leftBonus,
      forkRightBonus: rightBonus,
      forkChosenSide: null,
    };
  }

  private updateRealmProgression(dt: number): void {
    // Only advance realm timer while the vehicle is actually in motion
    if (this.busSpeed > 2.5) {
      this.realmTimer += dt;
    }

    const step = this.vehicleType === 'taxi' ? 6000 : 4500;
    // Enforce 30s–45s in-motion cadence so terrain never snaps abruptly on early score bursts
    const reachedPoints = this.score >= this.nextRealmScore && this.realmTimer >= 30;
    const reachedTime = this.realmTimer >= this.realmDuration;

    if (reachedPoints || reachedTime) {
      this.realmTimer = 0;
      if (reachedPoints) {
        // Guaranteed point-milestone progression: Lava -> Alien -> Mars, then cycling exotic/world realms
        if (this.exoticStage === 0) {
          this.exoticStage = 1; // Volcanic Lava Caldera
        } else if (this.exoticStage === 1) {
          this.exoticStage = 2; // Futuristic Alien Grid
        } else if (this.exoticStage === 2) {
          this.exoticStage = 3; // Martian Red Canyon
        } else {
          this.exoticStage = (this.exoticStage % EXOTIC_REALMS.length) + 1;
        }
        this.nextRealmScore = Math.floor(this.score) + step;
      } else {
        this.realmIdx++;
        if (this.exoticStage > 0) {
          this.exoticStage = (this.exoticStage % EXOTIC_REALMS.length) + 1;
        }
      }

      const nextRealm = this.getActiveRealm();
      this.sound.playRealmShift();
      this.showToast(`TERRAIN SHIFT: ${nextRealm.name}`, 'blue');
      // New chunks naturally spawn at the distant horizon via recycleChunks() while sky/fog crossfade gradually
    }
  }

  private getActiveWeather(): WeatherKind {
    return WEATHER_CYCLE[this.weatherIdx % WEATHER_CYCLE.length];
  }

  private updateWeatherProgression(dt: number): void {
    this.weatherTimer += dt;
    if (this.weatherTimer >= this.weatherDuration) {
      this.weatherTimer = 0;
      this.weatherIdx = (this.weatherIdx + 1) % WEATHER_CYCLE.length;
      const next = this.getActiveWeather();
      this.sound.playWeatherShift(next);

      if (next === 'dusty') {
        this.showToast('WEATHER: DUST STORM — LOW VISIBILITY & CROSSWINDS!', 'gold');
      } else if (next === 'heavyRain') {
        this.showToast('WEATHER: HEAVY RAIN — SLICK ROADS & REDUCED GRIP!', 'blue');
      } else if (next === 'monsoon') {
        this.lightningFlash = 0.9;
        this.thunderCooldown = THREE.MathUtils.randFloat(8, 15);
        this.showToast('WEATHER: MONSOON SQUALL — LIGHTNING & LONG BRAKING!', 'blue');
      } else if (next === 'blizzard') {
        this.showToast('WEATHER: BLIZZARD — WHITEOUT ICE & HEAVY DRIFT!', 'blue');
      } else {
        this.showToast('WEATHER: SUNNY SKIES — CLEAR VISIBILITY & FULL GRIP!', 'green');
      }
    }

    if (this.getActiveWeather() === 'monsoon') {
      this.thunderCooldown -= dt;
      if (this.thunderCooldown <= 0) {
        this.thunderCooldown = THREE.MathUtils.randFloat(10, 18);
        this.lightningFlash = 0.95;
        this.sound.playThunderClap();
      }
    }
  }

  private updateWeatherVisuals(dt: number): void {
    const weather = this.getActiveWeather();
    const anchorZ = this.busZ - 18;

    if (weather === 'monsoon' || weather === 'heavyRain') {
      const isMonsoon = weather === 'monsoon';
      this.rainInstanced.visible = true;
      this.dustInstanced.visible = false;
      this.snowInstanced.visible = false;
      _weatherEuler.set(isMonsoon ? 0.24 : 0.14, 0, isMonsoon ? -0.1 : -0.04);
      _weatherQuat.setFromEuler(_weatherEuler);
      _weatherScale.set(1, isMonsoon ? 1.15 : 0.92, 1);

      const xDrift = isMonsoon ? -3.4 : -1.2;
      const ySpeed = isMonsoon ? 35 : 28;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const idx = i * 3;
        this.rainPos[idx] += xDrift * dt;
        this.rainPos[idx + 1] -= ySpeed * dt;
        this.rainPos[idx + 2] += (this.busSpeed * 0.45 + 6) * dt;

        if (this.rainPos[idx + 1] < 0) {
          this.rainPos[idx + 1] += 20;
          this.rainPos[idx] = (Math.random() - 0.5) * 44;
          this.rainPos[idx + 2] = (Math.random() - 0.5) * 58;
        }
        if (this.rainPos[idx + 2] > 29) this.rainPos[idx + 2] -= 58;
        else if (this.rainPos[idx + 2] < -29) this.rainPos[idx + 2] += 58;

        _vec3A.set(this.busX + this.rainPos[idx], this.rainPos[idx + 1], anchorZ + this.rainPos[idx + 2]);
        _weatherMat4.compose(_vec3A, _weatherQuat, _weatherScale);
        this.rainInstanced.setMatrixAt(i, _weatherMat4);
      }
      this.rainInstanced.instanceMatrix.needsUpdate = true;

      if (this.busSpeed > 6) {
        this.rainSplashTimer -= dt;
        if (this.rainSplashTimer <= 0) {
          this.rainSplashTimer = isMonsoon ? 0.05 : 0.08;
          const zOff = this.vehicleType === 'flota' ? 3.2 : 2.1;
          for (const sx of [-0.95, 0.95]) {
            this.spawnBurst(this.busX + sx, 0.22, this.busZ + zOff, 0x93c5fd, 1, 2.6);
          }
        }
      }
    } else if (weather === 'blizzard') {
      this.rainInstanced.visible = false;
      this.dustInstanced.visible = false;
      this.snowInstanced.visible = true;
      _weatherEuler.set(this.elapsed * 1.4, this.elapsed * 1.1, 0.4);
      _weatherQuat.setFromEuler(_weatherEuler);
      _weatherScale.set(1, 1, 1);

      for (let i = 0; i < SNOW_COUNT; i++) {
        const idx = i * 3;
        this.snowPos[idx] += (8.5 + Math.sin(this.elapsed * 2.2 + i) * 3.2) * dt;
        this.snowPos[idx + 1] -= (7.5 + (i % 5) * 0.6) * dt;
        this.snowPos[idx + 2] += (this.busSpeed * 0.42 + 7.0) * dt;

        if (this.snowPos[idx + 1] < 0) {
          this.snowPos[idx + 1] += 18;
          this.snowPos[idx] = (Math.random() - 0.5) * 46;
          this.snowPos[idx + 2] = (Math.random() - 0.5) * 58;
        }
        if (this.snowPos[idx] > 23) this.snowPos[idx] -= 46;
        if (this.snowPos[idx + 2] > 29) this.snowPos[idx + 2] -= 58;
        else if (this.snowPos[idx + 2] < -29) this.snowPos[idx + 2] += 58;

        _vec3A.set(this.busX + this.snowPos[idx], this.snowPos[idx + 1], anchorZ + this.snowPos[idx + 2]);
        _weatherMat4.compose(_vec3A, _weatherQuat, _weatherScale);
        this.snowInstanced.setMatrixAt(i, _weatherMat4);
      }
      this.snowInstanced.instanceMatrix.needsUpdate = true;

      if (this.busSpeed > 6) {
        this.snowSprayTimer -= dt;
        if (this.snowSprayTimer <= 0) {
          this.snowSprayTimer = 0.06;
          const zOff = this.vehicleType === 'flota' ? 3.2 : 2.1;
          for (const sx of [-0.95, 0.95]) {
            this.spawnBurst(this.busX + sx, 0.24, this.busZ + zOff, 0xf1f5f9, 1, 2.8);
          }
        }
      }
    } else if (weather === 'dusty') {
      this.rainInstanced.visible = false;
      this.dustInstanced.visible = true;
      this.snowInstanced.visible = false;
      _weatherEuler.set(0, this.elapsed * 0.8, 0);
      _weatherQuat.setFromEuler(_weatherEuler);
      _weatherScale.set(1, 1, 1);

      for (let i = 0; i < DUST_COUNT; i++) {
        const idx = i * 3;
        this.dustPos[idx] += 9.5 * dt;
        this.dustPos[idx + 1] += Math.sin(this.elapsed * 2.5 + i) * 0.7 * dt;
        this.dustPos[idx + 2] += (this.busSpeed * 0.35 + 3) * dt;

        if (this.dustPos[idx] > 22) this.dustPos[idx] -= 44;
        if (this.dustPos[idx + 2] > 28) this.dustPos[idx + 2] -= 56;
        else if (this.dustPos[idx + 2] < -28) this.dustPos[idx + 2] += 56;

        _vec3A.set(this.busX + this.dustPos[idx], this.dustPos[idx + 1], anchorZ + this.dustPos[idx + 2]);
        _weatherMat4.compose(_vec3A, _weatherQuat, _weatherScale);
        this.dustInstanced.setMatrixAt(i, _weatherMat4);
      }
      this.dustInstanced.instanceMatrix.needsUpdate = true;
    } else {
      this.rainInstanced.visible = false;
      this.dustInstanced.visible = false;
      this.snowInstanced.visible = false;
    }
  }

  private recycleChunks(): void {
    const backThreshold = this.busZ + CHUNK_LENGTH * 1.4;
    const activeRealm = this.getActiveRealm();
    let minZ = Infinity;
    for (const c of this.chunks) {
      if (c.position.z < minZ) minZ = c.position.z;
    }
    for (const c of this.chunks) {
      if (c.position.z > backThreshold) {
        minZ -= CHUNK_LENGTH;
        c.position.z = minZ;
        const nextSeq = (c.userData.seqIdx ?? 0) + NUM_CHUNKS;
        const prevSegment = c.userData.segment as ChunkSegment | undefined;
        const nextSegment = this.getSegmentForSeq(nextSeq);
        c.userData.seqIdx = nextSeq;
        c.userData.segment = nextSegment;
        if (c.userData.realmId !== activeRealm.id || prevSegment !== nextSegment) {
          this.disposeGroupMeshes(c);
          this.populateChunkForKind(c, nextSeq, activeRealm.kind);
          c.userData.realmId = activeRealm.id;
        }
      }
    }
    const ground = this.scene.getObjectByName('infiniteGround');
    if (ground) {
      ground.position.z = this.busZ - 110;
    }
  }

  private updateSunFollow(): void {
    this.sunLight.position.set(this.busX + 28, 46, this.busZ + 18);
    this.sunLight.target.position.set(this.busX, 0, this.busZ - 18);
    this.sunLight.target.updateMatrixWorld();
  }

  private updateTrash(dt: number, checkBusHit: boolean): void {
    while (this.trashSpawnCursorZ > this.busZ - 190) {
      this.spawnTrashCluster();
    }

    for (let i = this.trashItems.length - 1; i >= 0; i--) {
      const t = this.trashItems[i];

      if (t.scattered) {
        t.vy -= 22 * dt;
        t.x += t.vx * dt;
        t.y = Math.max(0, t.y + t.vy * dt);
        t.z += t.vz * dt;
        t.mesh.position.set(t.x, t.y, t.z);
        t.mesh.rotation.x += t.spinX * dt;
        t.mesh.rotation.z += t.spinZ * dt;
      } else if (checkBusHit) {
        const dx = Math.abs(this.busX - t.x);
        const dz = Math.abs(this.busZ - t.z);
        if (dx < 1.5 && dz < 3.6) {
          t.scattered = true;
          t.vx = (t.x >= this.busX ? 1 : -1) * THREE.MathUtils.randFloat(5, 11);
          t.vy = THREE.MathUtils.randFloat(5.5, 9.5);
          t.vz = -this.busSpeed * 0.45;
          t.spinX = THREE.MathUtils.randFloat(-8, 8);
          t.spinZ = THREE.MathUtils.randFloat(-8, 8);
          this.sound.playTrashScatter();
          this.spawnBurst(t.x, 0.4, t.z, 0xd97706, 6, 5);
        }
      }

      if (t.z > this.busZ + 30) {
        this.scene.remove(t.mesh);
        this.trashItems.splice(i, 1);
      }
    }
  }

  private takeIntegrityHit(rawDamage: number, shieldMsg = 'ARMOR SHIELD ABSORBED IMPACT!'): number {
    if (this.activeBooster === 'shield') {
      this.activeBoosterTimer = Math.max(0, this.activeBoosterTimer - 1.2);
      if (this.activeBoosterTimer <= 0) {
        this.activeBooster = null;
      }
      this.sound.playShieldBlock();
      this.spawnBurst(this.busX, 1.35, this.busZ, 0xfacc15, 16, 9.5);
      this.showToast(shieldMsg, 'gold');
      return 0;
    }
    this.health = Math.max(0, this.health - rawDamage);
    return rawDamage;
  }

  private spawnRoadPickup(): void {
    this.roadPickupSpawnCursorZ -= THREE.MathUtils.randFloat(36, 54);
    const z = this.roadPickupSpawnCursorZ;
    const x = this.getRandomBranchXAtZ(z, 1.55);

    const roll = Math.random();
    let kind: RoadPickupKind;
    const fuelBias = this.fuel < 48 ? 0.64 : 0.46;
    if (roll < fuelBias) {
      kind = 'fuelCan';
    } else {
      const rem = (roll - fuelBias) / (1 - fuelBias);
      if (rem < 0.35) kind = 'nitro';
      else if (rem < 0.68) kind = 'shield';
      else kind = 'magnet';
    }

    const built = createRoadPickupMesh(this.textures, kind);
    built.root.position.set(x, 0, z);
    this.scene.add(built.root);

    this.roadPickups.push({
      kind,
      mesh: built.root,
      spinGroup: built.spinGroup,
      ringMat: built.ringMat,
      x,
      z,
      collected: false,
      phase: Math.random() * Math.PI * 2,
    });
  }

  private updateRoadPickups(dt: number, checkCollection: boolean): void {
    while (this.roadPickupSpawnCursorZ > this.busZ - 210) {
      this.spawnRoadPickup();
    }

    const busHalfW = this.vehicleType === 'taxi' ? 0.94 : this.vehicleType === 'jungleJeep' ? 1.0 : 1.15;
    const busHalfL =
      this.vehicleType === 'flota'
        ? 3.95
        : this.vehicleType === 'taxi'
          ? 2.28
          : this.vehicleType === 'jungleJeep'
            ? 2.18
            : 3.35;

    for (let i = this.roadPickups.length - 1; i >= 0; i--) {
      const p = this.roadPickups[i];
      p.spinGroup.rotation.y += 2.4 * dt;
      p.spinGroup.position.y = 0.85 + Math.sin(this.elapsed * 3.5 + p.phase) * 0.14;
      p.ringMat.opacity = 0.55 + Math.sin(this.elapsed * 5 + p.phase) * 0.22;

      if (checkCollection && this.activeBooster === 'magnet' && p.z > this.busZ - 30 && p.z < this.busZ + 6) {
        const dxM = this.busX - p.x;
        const dzM = this.busZ - p.z;
        const dist = Math.hypot(dxM, dzM);
        if (dist > 0.05) {
          const pull = Math.min(dist, 22 * dt);
          p.x += (dxM / dist) * pull;
          p.z += (dzM / dist) * pull;
          p.mesh.position.set(p.x, 0, p.z);
        }
      }

      if (
        checkCollection &&
        !p.collected &&
        Math.abs(this.busX - p.x) < busHalfW + 1.3 &&
        Math.abs(this.busZ - p.z) < busHalfL + 1.45
      ) {
        p.collected = true;
        if (p.kind === 'fuelCan') {
          this.fuel = Math.min(this.maxFuel, this.fuel + 38);
          this.fuelCollected++;
          this.score += 150 * this.combo;
          this.sound.playFuelPickup();
          this.spawnBurst(p.x, 1.0, p.z, 0xf59e0b, 14, 7.5);
          this.showToast('FUEL CAN! +38% FUEL · +150 PTS', 'gold');
        } else if (p.kind === 'nitro') {
          this.boostCharge = Math.min(100, this.boostCharge + 55);
          this.activeBooster = 'nitro';
          this.activeBoosterTimer = 6.5;
          this.boostersCollected++;
          this.score += 250 * this.combo;
          this.sound.playBoosterPickup();
          this.spawnBurst(p.x, 1.1, p.z, 0x38bdf8, 16, 9);
          this.showToast('NITRO BOOSTER! OVERDRIVE SPEED (6.5s)', 'blue');
        } else if (p.kind === 'shield') {
          this.health = Math.min(this.maxHealth, this.health + 22);
          this.activeBooster = 'shield';
          this.activeBoosterTimer = 7.0;
          this.boostersCollected++;
          this.score += 250 * this.combo;
          this.sound.playBoosterPickup();
          this.spawnBurst(p.x, 1.1, p.z, 0xfacc15, 16, 9);
          this.showToast('ARMOR SHIELD! +22% INTEGRITY · 7s SHIELD', 'green');
        } else {
          this.boostCharge = Math.min(100, this.boostCharge + 25);
          this.activeBooster = 'magnet';
          this.activeBoosterTimer = 8.0;
          this.boostersCollected++;
          this.score += 250 * this.combo;
          if (this.vehicleType === 'jungleJeep') {
            this.gunHeat = 0;
            this.gunOverheated = false;
          } else if (this.vehicleType === 'taxi') {
            this.taxiTimeLeft += 6;
          }
          this.sound.playBoosterPickup();
          this.spawnBurst(p.x, 1.1, p.z, 0xe879f9, 16, 9);
          this.showToast('MAGNET BOOSTER! AUTO-PULLING FUEL & BOOSTERS!', 'blue');
        }

        this.scene.remove(p.mesh);
        this.roadPickups.splice(i, 1);
        continue;
      }

      if (p.z > this.busZ + 28) {
        this.scene.remove(p.mesh);
        this.roadPickups.splice(i, 1);
      }
    }
  }

  private isPathClearForPass(candX: number, self: TrafficEntity): boolean {
    const b = this.getRoadBoundsAtZ(self.z);
    if (candX < -(b.outerHalf - self.halfW - 0.35) || candX > b.outerHalf - self.halfW - 0.35) {
      return false;
    }
    if (b.innerBarrierHalf > 0.08 && Math.abs(candX) < b.innerBarrierHalf + self.halfW + 0.45) {
      return false;
    }
    const busHalfL =
      this.vehicleType === 'flota'
        ? 3.95
        : this.vehicleType === 'taxi'
          ? 2.28
          : this.vehicleType === 'jungleJeep'
            ? 2.18
            : 3.35;
    const busHalfW = this.vehicleType === 'taxi' ? 0.94 : this.vehicleType === 'jungleJeep' ? 1.0 : 1.15;
    const busMargin =
      self.dir === -1 && self.z > this.busZ && self.z - this.busZ < 24
        ? 22
        : busHalfL + self.halfL + 5.5;
    if (Math.abs(self.z - this.busZ) < busMargin && Math.abs(candX - this.busX) < busHalfW + 0.7 + self.halfW) {
      return false;
    }

    for (const other of this.traffic) {
      if (other === self || other.knockedOut) continue;
      if (Math.abs(other.x - candX) < self.halfW + other.halfW + 0.7) {
        if (other.dir !== self.dir && Math.abs(self.z - other.z) < 38) {
          return false; // Opposing traffic approaching in that lane
        }
        if (Math.abs(other.z - self.z) < self.halfL + other.halfL + 7.5) {
          return false; // Occupied nearby
        }
      }
    }
    return true;
  }

  private updateTraffic(dt: number, checkCollisions: boolean): void {
    while (this.trafficSpawnCursorZ > this.busZ - 235) {
      this.spawnTrafficWave();
    }

    // Spawn trailing traffic behind the vehicle when slowing down or stopped so cars approach, brake, and pass!
    if (checkCollisions && this.busSpeed < 13) {
      this.rearTrafficCooldown -= dt;
      if (this.rearTrafficCooldown <= 0) {
        let rearCount = 0;
        for (const tr of this.traffic) {
          if (!tr.knockedOut && tr.dir === -1 && tr.z > this.busZ + 4 && tr.z < this.busZ + 52) {
            rearCount++;
          }
        }
        if (rearCount < 4) {
          this.spawnTrailingTrafficVehicle();
        }
        this.rearTrafficCooldown = THREE.MathUtils.randFloat(1.1, 1.9);
      }
    }

    const busHalfW = this.vehicleType === 'taxi' ? 0.94 : this.vehicleType === 'jungleJeep' ? 1.0 : 1.15;
    const busHalfL =
      this.vehicleType === 'flota'
        ? 3.95
        : this.vehicleType === 'taxi'
          ? 2.28
          : this.vehicleType === 'jungleJeep'
            ? 2.18
            : 3.35;

    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const tr = this.traffic[i];

      if (tr.knockedOut) {
        tr.x += tr.knockVx * dt;
        tr.z += tr.knockVz * dt;
        tr.mesh.position.set(tr.x, 0, tr.z);
        tr.mesh.rotation.y += tr.knockSpin * dt;
      } else {
        if (tr.circumventTimer > 0) tr.circumventTimer -= dt;
        if (tr.hornReactTimer > 0) {
          tr.hornReactTimer -= dt;
          if (tr.hornReactTimer <= 0) {
            tr.hornReactMode = 'none';
          }
        }
        let desiredSpeed = tr.speed;
        let behindSlowBus = false;

        if (tr.hornReactMode === 'brakeJam') {
          desiredSpeed = Math.min(desiredSpeed, tr.dir === 1 ? 3.2 : 1.0);
        }

        if (tr.dir === -1) {
          // 1. Detect if the Bus / Trufi is ahead in the same path & slowing/stopped
          const busRearZ = this.busZ + busHalfL + 0.1;
          const vehFrontZ = tr.z - tr.halfL;
          const gapToBus = vehFrontZ - busRearZ;
          const alignedWithBus = Math.abs(tr.x - this.busX) < 1.45 + tr.halfW;

          if (alignedWithBus && gapToBus > -1.2 && gapToBus < 28 && this.busSpeed < tr.speed + 1) {
            behindSlowBus = true;
            if (gapToBus <= 2.6) {
              desiredSpeed = Math.min(desiredSpeed, Math.max(0, this.busSpeed * 0.72));
            } else {
              const t = THREE.MathUtils.clamp((gapToBus - 2.6) / 25.4, 0, 1);
              const approachCap = Math.max(0, this.busSpeed) + t * (tr.speed - Math.max(0, this.busSpeed));
              desiredSpeed = Math.min(desiredSpeed, approachCap);
            }

            // Try to circumvent the slow/stopped bus if gap < 20m!
            if (
              tr.hornReactMode !== 'brakeJam' &&
              gapToBus < 20 &&
              (this.busSpeed < tr.speed - 2.0 || this.busSpeed < 12) &&
              tr.circumventTimer <= 0
            ) {
              const offset = tr.kind === 'motorbike' ? 2.25 : 3.55;
              const leftPass = this.busX - offset;
              const rightPass = this.busX + offset;
              const altLeft = -1.95;
              const altRight = 5.85;
              const candidates =
                this.busX > 3.2
                  ? [leftPass, altLeft, rightPass]
                  : [leftPass, rightPass, altRight, altLeft];

              for (const candX of candidates) {
                if (this.isPathClearForPass(candX, tr)) {
                  tr.targetX = candX;
                  tr.circumventTimer = 1.6;
                  break;
                }
              }
            }
          }

          // Never weave laterally into the side of the player's bus while alongside it!
          if (Math.abs(tr.z - this.busZ) < busHalfL + tr.halfL + 3.5) {
            if (Math.abs(tr.targetX - this.busX) < 1.65 + tr.halfW) {
              const leftSafe = this.busX - (1.85 + tr.halfW);
              const rightSafe = this.busX + (1.85 + tr.halfW);
              if (this.isPathClearForPass(leftSafe, tr)) {
                tr.targetX = leftSafe;
              } else if (this.isPathClearForPass(rightSafe, tr)) {
                tr.targetX = rightSafe;
              }
            }
          }
        } else {
          // Oncoming / wrong-way vehicles actively evade the player's bus/trufi & oncoming trufis!
          const approachDist = this.busZ - tr.z;
          if (
            approachDist > -2 &&
            approachDist < 36 &&
            Math.abs(tr.x - this.busX) < 1.65 + tr.halfW
          ) {
            desiredSpeed = Math.min(desiredSpeed, 8.5);
            if (tr.hornReactMode !== 'brakeJam' && tr.circumventTimer <= 0) {
              const candidates = [
                this.busX < 0 ? tr.x + 3.4 : tr.x - 3.4,
                -5.85,
                -1.95,
                1.95,
                5.85,
              ];
              for (const candX of candidates) {
                if (this.isPathClearForPass(candX, tr)) {
                  tr.targetX = candX;
                  tr.circumventTimer = 1.5;
                  break;
                }
              }
            }
          }
          // Wrong-way cars also evade oncoming trufis/cars so they never blindly ram them
          if (tr.wrongWay) {
            for (const other of this.traffic) {
              if (other === tr || other.knockedOut || other.dir === tr.dir) continue;
              const dzHead = other.z - tr.z;
              if (dzHead > 0 && dzHead < 30 && Math.abs(other.x - tr.x) < tr.halfW + other.halfW + 0.65) {
                desiredSpeed = Math.min(desiredSpeed, 7.5);
                if (tr.circumventTimer <= 0) {
                  for (const candX of [tr.x - 3.6, tr.x + 3.6, -1.95, -5.85]) {
                    if (this.isPathClearForPass(candX, tr)) {
                      tr.targetX = candX;
                      tr.circumventTimer = 1.5;
                      break;
                    }
                  }
                }
                break;
              }
            }
          }
        }

        // 2. Keep safe following distance & form realistic bumper-to-bumper traffic jams behind stopped/jammed vehicles!
        for (const other of this.traffic) {
          if (other === tr || other.knockedOut || other.dir !== tr.dir) continue;
          if (Math.abs(other.x - tr.x) < tr.halfW + other.halfW + 0.45) {
            // Distance ahead along movement direction (-Z for dir=-1, +Z for dir=1)
            const gapOther =
              tr.dir === -1
                ? (tr.z - tr.halfL) - (other.z + other.halfL)
                : (other.z - other.halfL) - (tr.z + tr.halfL);

            const isJamAhead = other.hornReactMode === 'brakeJam' || other.currentSpeed < 5.0;
            const detectRange = isJamAhead ? 26 : 18;

            if (gapOther > -0.6 && gapOther < detectRange) {
              const followCap =
                gapOther <= 2.3
                  ? Math.max(0, other.currentSpeed * 0.68)
                  : Math.max(0, other.currentSpeed) + ((gapOther - 2.3) / (detectRange - 2.3)) * tr.speed;
              desiredSpeed = Math.min(desiredSpeed, followCap);

              if (
                tr.hornReactMode !== 'brakeJam' &&
                gapOther < 12 &&
                other.currentSpeed < tr.speed - 2 &&
                tr.circumventTimer <= 0 &&
                (!isJamAhead || Math.random() < 0.35)
              ) {
                const offset = tr.kind === 'motorbike' ? 2.0 : 3.25;
                const candidates = [tr.x - offset, tr.x + offset];
                for (const candX of candidates) {
                  if (this.isPathClearForPass(candX, tr)) {
                    tr.targetX = candX;
                    tr.circumventTimer = 1.4;
                    break;
                  }
                }
              }
            }
          }
        }

        const speedRate = desiredSpeed < tr.currentSpeed ? (tr.hornReactMode === 'brakeJam' ? 11.5 : 8.4) : 3.4;
        const prevSpeed = tr.currentSpeed;
        tr.currentSpeed = THREE.MathUtils.damp(tr.currentSpeed, desiredSpeed, speedRate, dt);
        if (tr.currentSpeed < 0.05) tr.currentSpeed = 0;

        tr.z += tr.dir * tr.currentSpeed * dt;

        // Hard anti-clipping bumper cushion behind the bus while braking/queued
        if (
          tr.dir === -1 &&
          tr.z > this.busZ + 1.2 &&
          Math.abs(tr.x - this.busX) < 1.35 + tr.halfW
        ) {
          const minRearZ = this.busZ + busHalfL + tr.halfL + 0.75;
          if (tr.z < minRearZ) {
            tr.z = minRearZ;
            tr.currentSpeed = Math.min(tr.currentSpeed, this.busSpeed);
          }
        }

        // Standard lane weaving ONLY when safe (never weaving into the bus or a trufi!)
        if (!behindSlowBus && tr.circumventTimer <= 0 && tr.hornReactMode === 'none') {
          if (
            tr.kind === 'sedan' ||
            tr.kind === 'taxi' ||
            tr.kind === 'trufi' ||
            tr.kind === 'torito' ||
            tr.kind === 'motorbike'
          ) {
            tr.weaveTimer -= dt;
            if (tr.weaveTimer <= 0) {
              tr.weaveTimer = THREE.MathUtils.randFloat(1.6, 3.4);
              let candX = tr.targetX;
              if (tr.kind === 'motorbike') {
                candX =
                  tr.baseSide === -1
                    ? THREE.MathUtils.randFloat(-5.8, -1.6)
                    : THREE.MathUtils.randFloat(1.6, 5.8);
              } else {
                const sideLanes = tr.baseSide === -1 ? OPPOSING_LANES : FORWARD_LANES;
                candX = sideLanes[Math.floor(Math.random() * sideLanes.length)];
              }
              if (this.isPathClearForPass(candX, tr)) {
                tr.targetX = candX;
              }
            }
          }
        }

        // Smooth lateral steering toward targetX + urgent swerve roll & brake nose-dive pitch
        const prevX = tr.x;
        const baseSteer = tr.kind === 'motorbike' ? 6.5 : 4.4;
        const steerSpeed = tr.hornReactMode === 'swerve' ? baseSteer * 1.6 : baseSteer;
        tr.targetX = this.clampXToRoad(tr.targetX, tr.z, tr.halfW + 0.35);
        tr.x = THREE.MathUtils.damp(tr.x, tr.targetX, steerSpeed, dt);
        tr.x = this.clampXToRoad(tr.x, tr.z, tr.halfW + 0.3);
        const brakingDelta = prevSpeed - tr.currentSpeed;
        const targetBrakePitch = brakingDelta > 0.08 || tr.hornReactMode === 'brakeJam' ? -0.055 * tr.dir : 0;
        tr.hornPitch = THREE.MathUtils.damp(tr.hornPitch, targetBrakePitch, 10, dt);
        tr.mesh.rotation.x = tr.hornPitch;
        tr.mesh.rotation.z = -(tr.x - prevX) * (tr.hornReactMode === 'swerve' ? 1.1 : 0.75) * -tr.dir;
        tr.mesh.position.set(tr.x, 0, tr.z);
      }

      if (tr.z > this.busZ + 56 || tr.z < this.busZ - 320) {
        this.scene.remove(tr.mesh);
        this.traffic.splice(i, 1);
        continue;
      }

      if (!checkCollisions || tr.knockedOut) continue;

      // Queued / stopped vehicle behind the bus should wait without exploding into a collision
      if (
        tr.dir === -1 &&
        tr.z > this.busZ + 1.5 &&
        tr.currentSpeed <= this.busSpeed + 3.2
      ) {
        continue;
      }

      const dx = Math.abs(this.busX - tr.x);
      const dz = Math.abs(this.busZ - tr.z);

      if (dx < busHalfW + tr.halfW && dz < busHalfL + tr.halfL) {
        tr.knockedOut = true;
        tr.knockVx = (tr.x >= this.busX ? 1 : -1) * 14;
        tr.knockVz = tr.dir === 1 ? 8 : -this.busSpeed * 0.7;
        tr.knockSpin = (tr.x >= this.busX ? -1 : 1) * 6;

        this.spawnBurst((this.busX + tr.x) * 0.5, 1.0, (this.busZ + tr.z) * 0.5, 0xfbbf24, 14, 10);

        if (this.invulnTimer <= 0) {
          const dealt = this.takeIntegrityHit(tr.damage);
          this.invulnTimer = 0.85;
          if (dealt > 0) {
            this.combo = 1;
            this.busSpeed = Math.max(7, this.busSpeed * 0.64);
            this.cameraShake = 0.75;
            this.hitstopTimer = 0.045;
            this.sound.playCollision(dealt / 20);
            this.showToast(
              tr.wrongWay
                ? `WRONG-WAY COLLISION! -${dealt}% INTEGRITY`
                : tr.dir === 1
                  ? `HEAD-ON COLLISION! -${dealt}% INTEGRITY`
                  : `TRAFFIC IMPACT! -${dealt}% INTEGRITY`,
              'red',
            );

            if (this.health <= 0) {
              const vehLabel = getVehicleOption(this.vehicleType).shortName;
              this.triggerGameOver(`Your ${vehLabel} took too much traffic damage and stalled out!`);
              return;
            }
          }
        }
      } else if (
        !tr.nearMissed &&
        this.busSpeed > 18 &&
        dz < busHalfL + tr.halfL + 1.2 &&
        dx < busHalfW + tr.halfW + 1.1
      ) {
        tr.nearMissed = true;
        const bonus = (tr.dir === 1 ? 100 : 75) * this.combo;
        this.score += bonus;
        this.boostCharge = Math.min(100, this.boostCharge + 10);
        this.sound.playNearMiss();
      }
    }
  }

  private updateObstacles(dt: number, checkCollisions = true): void {
    while (this.obstacleSpawnCursorZ > this.busZ - 210) {
      this.spawnObstacle();
    }

    const busHalfW = this.vehicleType === 'taxi' ? 0.92 : this.vehicleType === 'jungleJeep' ? 0.96 : 1.12;
    const busHalfL =
      this.vehicleType === 'flota'
        ? 3.9
        : this.vehicleType === 'taxi'
          ? 2.25
          : this.vehicleType === 'jungleJeep'
            ? 2.15
            : 3.3;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs.hit) {
        obs.knockVy -= 24 * dt;
        obs.x += obs.knockVx * dt;
        obs.y = Math.max(0, obs.y + obs.knockVy * dt);
        obs.z += obs.knockVz * dt;
        obs.mesh.position.set(obs.x, obs.y, obs.z);
        obs.mesh.rotation.z += dt * 7;
        obs.mesh.rotation.x += dt * 5;
      } else if (obs.kind === 'boulder' || obs.kind === 'rollingLog') {
        // Rolling giant jungle boulder or spinning timber log tumbling across trail!
        obs.x += obs.vx * dt;
        const obBounds = this.getRoadBoundsAtZ(obs.z);
        const outerLimit = obBounds.outerHalf - 0.85;
        if (Math.abs(obs.x) > outerLimit) {
          obs.x = Math.sign(obs.x) * outerLimit;
          obs.vx *= -1;
        }
        if (obBounds.innerBarrierHalf > 0.15 && Math.abs(obs.x) < obBounds.innerBarrierHalf + 1.1) {
          obs.x = (obs.x >= 0 ? 1 : -1) * (obBounds.innerBarrierHalf + 1.1);
          obs.vx *= -1;
        }
        obs.mesh.position.set(obs.x, 0, obs.z);
        const bodyMesh = obs.mesh.children[1];
        if (bodyMesh) {
          if (obs.kind === 'rollingLog') {
            bodyMesh.rotation.x -= dt * 4.5;
          } else {
            bodyMesh.rotation.z -= obs.vx * dt * 1.15;
            bodyMesh.rotation.x -= dt * 2.2;
          }
        }
        obs.animPhase += dt;
        if (obs.animPhase > 0.16 && checkCollisions) {
          obs.animPhase = 0;
          this.spawnBurst(obs.x, 0.3, obs.z, obs.kind === 'rollingLog' ? 0x78350f : 0x78716c, 2, 3.2);
        }
      } else if (obs.kind === 'wreckedCar' || obs.kind === 'mudPit' || obs.kind === 'barricade') {
        obs.mesh.position.set(obs.x, 0, obs.z);
      } else if (obs.kind === 'fallingTree' && obs.fallingTreeRig) {
        // Dramatic toppling rainforest tree triggered as Jeep approaches!
        const distToJeep = this.busZ - obs.z;
        if (!obs.fallTriggered && distToJeep < 56) {
          obs.fallTriggered = true;
          if (checkCollisions) this.sound.playCinematicRumble(0.95);
        }
        if (obs.fallTriggered && (obs.fallProgress ?? 0) < 1) {
          obs.fallProgress = Math.min(1, (obs.fallProgress ?? 0) + dt * 1.95);
          const p = obs.fallProgress;
          const ease = p * p;
          obs.fallingTreeRig.hinge.rotation.z = (obs.fallDir ?? 1) * ease * 1.48;
          if (p >= 1 && checkCollisions) {
            this.cameraShake = Math.max(this.cameraShake, 0.42);
            this.spawnBurst(obs.hitX ?? obs.x, 0.6, obs.z, 0x16a34a, 12, 8);
            this.spawnBurst(obs.hitX ?? obs.x, 0.4, obs.z, 0x78350f, 8, 6);
          }
        }
      } else if (obs.kind === 'ruinPillar' && obs.ruinRig) {
        // Ancient stone temple column shudders & crashes into lane!
        const distToJeep = this.busZ - obs.z;
        if (!obs.fallTriggered && distToJeep < 52) {
          obs.fallTriggered = true;
          if (checkCollisions) this.sound.playCinematicRumble(0.8);
        }
        if (obs.fallTriggered && (obs.fallProgress ?? 0) < 1) {
          obs.fallProgress = Math.min(1, (obs.fallProgress ?? 0) + dt * 2.15);
          const p = obs.fallProgress;
          const ease = p * p;
          obs.ruinRig.column.rotation.z = (obs.fallDir ?? 1) * ease * 1.48;
          if (p >= 1 && checkCollisions) {
            this.cameraShake = Math.max(this.cameraShake, 0.36);
            this.spawnBurst(obs.hitX ?? obs.x, 0.6, obs.z, 0xa8a29e, 14, 7.5);
          }
        }
      } else if (obs.startled) {
        const fleeSpeed = obs.kind === 'cow' ? 6.5 : obs.kind === 'vendor' ? 5.6 : obs.kind === 'caiman' ? 7.2 : 8.0;
        obs.x += obs.startleDir * fleeSpeed * dt;
        if (obs.kind === 'caiman' && obs.caimanRig) {
          obs.caimanRig.body.rotation.y = obs.startleDir > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else {
          obs.mesh.rotation.y = obs.startleDir > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
        obs.animPhase += dt * 15;
        obs.mesh.position.set(obs.x, 0, obs.z);
      } else {
        obs.x += obs.vx * dt;
        const obBounds = this.getRoadBoundsAtZ(obs.z);
        if (obs.kind === 'cow' || obs.kind === 'caiman') {
          if (Math.abs(obs.x) > obBounds.outerHalf - 1.0) {
            obs.vx *= -1;
            if (obs.kind === 'caiman' && obs.caimanRig) {
              obs.caimanRig.body.rotation.y = obs.vx > 0 ? -Math.PI / 2 : Math.PI / 2;
            }
          }
          obs.animPhase += Math.abs(obs.vx) > 0.1 ? dt * 7 : dt * 1.5;
        } else {
          if (obs.x > obBounds.outerHalf + 1.2 || obs.x < -obBounds.outerHalf - 1.2) {
            obs.vx *= -1;
            obs.mesh.rotation.y = obs.vx > 0 ? -Math.PI / 2 : Math.PI / 2;
          }
          obs.animPhase += dt * (obs.kind === 'dog' ? 14 : 9);
        }
        if (obBounds.innerBarrierHalf > 0.15 && Math.abs(obs.x) < obBounds.innerBarrierHalf + 0.9) {
          obs.vx *= -1;
          obs.x = (obs.x >= 0 ? 1 : -1) * (obBounds.innerBarrierHalf + 0.95);
        }
        obs.mesh.position.set(obs.x, 0, obs.z);
      }

      if (!obs.hit) {
        if (obs.cowRig) {
          const swing = Math.abs(obs.vx) > 0.1 || obs.startled ? Math.sin(obs.animPhase) * 0.45 : 0;
          obs.cowRig.legs[0].rotation.x = swing;
          obs.cowRig.legs[1].rotation.x = -swing;
          obs.cowRig.legs[2].rotation.x = -swing;
          obs.cowRig.legs[3].rotation.x = swing;
          obs.cowRig.head.rotation.x = Math.sin(obs.animPhase * 0.5) * 0.12;
          obs.cowRig.tail.rotation.z = Math.sin(obs.animPhase * 1.2) * 0.25;
        } else if (obs.dogRig) {
          const trot = Math.sin(obs.animPhase) * 0.65;
          obs.dogRig.legs[0].rotation.x = trot;
          obs.dogRig.legs[1].rotation.x = -trot;
          obs.dogRig.legs[2].rotation.x = -trot;
          obs.dogRig.legs[3].rotation.x = trot;
          obs.dogRig.tail.rotation.z = Math.sin(obs.animPhase * 1.6) * 0.4;
        } else if (obs.pedRig) {
          const stride = Math.sin(obs.animPhase) * 0.55;
          obs.pedRig.leftLeg.rotation.x = stride;
          obs.pedRig.rightLeg.rotation.x = -stride;
          obs.pedRig.leftArm.rotation.x = -stride * 0.8;
          obs.pedRig.rightArm.rotation.x = stride * 0.8;
        } else if (obs.vendorRig) {
          const stride = Math.sin(obs.animPhase) * 0.45;
          obs.vendorRig.ped.leftLeg.rotation.x = stride;
          obs.vendorRig.ped.rightLeg.rotation.x = -stride;
          for (const w of obs.vendorRig.cartWheels) {
            w.rotation.x -= dt * 4;
          }
        } else if (obs.caimanRig) {
          obs.caimanRig.tail.rotation.y = Math.sin(obs.animPhase * 1.3) * 0.38;
          obs.caimanRig.jaw.rotation.x = 0.08 + Math.max(0, Math.sin(obs.animPhase * 1.1)) * 0.28;
        }
      }

      // Award clean dodge bonus when driving Jungle Jeep or on Jungle Trails!
      if (
        checkCollisions &&
        (this.worldType === 'jungle' || this.vehicleType === 'jungleJeep') &&
        !obs.hit &&
        !obs.dodged &&
        obs.z > this.busZ + 4
      ) {
        obs.dodged = true;
        this.jungleDodged++;
        this.combo = Math.min(5, this.combo + 1);
        this.score += 180 * this.combo;
        this.boostCharge = Math.min(100, this.boostCharge + 14);
      }

      if (obs.z > this.busZ + 32 || Math.abs(obs.x) > 26) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
        continue;
      }

      if (!checkCollisions || obs.hit) continue;

      // Dynamic collision footprint for falling trees & stone columns
      let colX = obs.x;
      let colHalfW = obs.halfW;
      if ((obs.kind === 'fallingTree' || obs.kind === 'ruinPillar') && (obs.fallProgress ?? 0) > 0.65) {
        colX = obs.hitX ?? obs.x;
        colHalfW = obs.kind === 'fallingTree' ? 3.1 : 2.1;
      }

      const dx = Math.abs(this.busX - colX);
      const dz = Math.abs(this.busZ - obs.z);

      // Mud Pits / Street Slicks slow down & splash mud without destroying the obstacle
      if (obs.kind === 'mudPit') {
        if (this.busSpeed > 1.5 && dx < busHalfW + colHalfW * 0.82 && dz < busHalfL + obs.halfL * 0.82) {
          this.mudSlowTimer = 1.35;
          if (this.mudSoundCooldown <= 0) {
            this.mudSoundCooldown = 0.65;
            this.sound.playMudSplash();
            this.spawnBurst(this.busX, 0.45, this.busZ, 0x5c3a21, 12, 7.5);
            this.showToast(
              this.worldType === 'city'
                ? 'OIL & WATER SLICK! TRACTION LOST!'
                : 'DEEP MUD BOG! VEHICLE SLOWED!',
              'gold',
            );
          }
        }
        continue;
      }

      if (this.busSpeed > 1.8 && dx < busHalfW + colHalfW && dz < busHalfL + obs.halfL) {
        obs.hit = true;
        obs.knockVx = (colX >= this.busX ? 1 : -1) * THREE.MathUtils.randFloat(8, 13);
        obs.knockVy = THREE.MathUtils.randFloat(6.5, 9.5);
        obs.knockVz = -this.busSpeed * 0.55;

        this.spawnBurst(colX, 1.0, obs.z, 0xef4444, 18, 10);
        this.combo = 1;
        this.busSpeed = Math.max(7, this.busSpeed * 0.68);
        this.cameraShake = 0.82;
        this.hitstopTimer = 0.045;
        this.sound.playCollision(1.0);

        if (obs.kind === 'pedestrian' || obs.kind === 'vendor') {
          const dealt = this.takeIntegrityHit(22);
          this.pedestrianStrikes++;
          this.totalPedestriansHit++;

          if (this.health <= 0) {
            const vehLabel = getVehicleOption(this.vehicleType).shortName;
            this.triggerGameOver(`Your ${vehLabel} lost all integrity after reckless street collisions!`);
            return;
          }

          if (this.pedestrianStrikes >= 3 && !this.policeActive) {
            this.startPolicePursuit();
          } else if (this.policeActive) {
            this.policeTimer = Math.min(this.policeMaxTimer, this.policeTimer + 4);
            this.showToast(`PEDESTRIAN HIT! +4s ADDED TO PURSUIT · -${dealt}% INTEGRITY`, 'red');
          } else {
            this.showToast(
              `PEDESTRIAN HIT! WANTED ${this.pedestrianStrikes}/3 · -${dealt}% INTEGRITY`,
              'red',
            );
          }
        } else if (
          obs.kind === 'boulder' ||
          obs.kind === 'fallingTree' ||
          obs.kind === 'caiman' ||
          obs.kind === 'ruinPillar' ||
          obs.kind === 'rollingLog' ||
          obs.kind === 'wreckedCar' ||
          obs.kind === 'barricade'
        ) {
          const dmg =
            obs.kind === 'boulder' || obs.kind === 'wreckedCar'
              ? 24
              : obs.kind === 'fallingTree' || obs.kind === 'ruinPillar'
                ? 22
                : obs.kind === 'rollingLog'
                  ? 20
                  : 18;
          const dealt = this.takeIntegrityHit(dmg);
          if (dealt > 0) {
            const label =
              obs.kind === 'boulder'
                ? 'BOULDER IMPACT!'
                : obs.kind === 'fallingTree'
                  ? 'CRASHED INTO FALLEN TREE!'
                  : obs.kind === 'caiman'
                    ? 'CAIMAN STRIKE!'
                    : obs.kind === 'rollingLog'
                      ? 'TIMBER LOG COLLISION!'
                      : obs.kind === 'wreckedCar'
                        ? 'WRECKED CAR CRASH!'
                        : obs.kind === 'barricade'
                          ? 'BARRICADE SMASH!'
                          : 'TEMPLE RUIN COLLISION!';
            this.showToast(`${label} -${dealt}% INTEGRITY`, 'red');
          }
          if (this.health <= 0) {
            const vehLabel = getVehicleOption(this.vehicleType).shortName;
            this.triggerGameOver(`Your ${vehLabel} stalled out from heavy hazard impacts!`);
            return;
          }
        } else {
          const dmg = obs.kind === 'cow' ? 25 : 15;
          const dealt = this.takeIntegrityHit(dmg);
          if (dealt > 0) {
            this.showToast(
              obs.kind === 'cow'
                ? `LIVESTOCK IMPACT! -${dealt}% INTEGRITY`
                : `STRAY DOG HIT! -${dealt}% INTEGRITY`,
              'red',
            );
          }
          if (this.health <= 0) {
            const vehLabel = getVehicleOption(this.vehicleType).shortName;
            this.triggerGameOver(`Your ${vehLabel} stalled out after hitting road hazards!`);
            return;
          }
        }
      }
    }
  }

  private updateWeaponsAndCombat(dt: number): void {
    if (this.gunFireCooldown > 0) this.gunFireCooldown = Math.max(0, this.gunFireCooldown - dt);
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0 && this.jungleJeep.muzzleFlash) {
        this.jungleJeep.muzzleFlash.visible = false;
      }
    }

    if (this.jungleJeep.turretGroup) {
      this.jungleJeep.turretGroup.position.z = THREE.MathUtils.damp(
        this.jungleJeep.turretGroup.position.z,
        -0.05,
        24,
        dt,
      );
    }

    const wantFire =
      this.heldKeys.has('KeyF') ||
      this.heldKeys.has('KeyJ') ||
      this.virtualInput.fire ||
      this.pointerFiring;

    if (wantFire && !this.gunOverheated) {
      if (this.gunFireCooldown <= 0) {
        this.gunFireCooldown = 0.105;
        this.gunHeat = Math.min(100, this.gunHeat + 7.5);
        if (this.gunHeat >= 100) {
          this.gunOverheated = true;
          this.showToast('MACHINE GUN OVERHEATED! COOLING BARREL...', 'red');
        }

        const bMesh = createBulletMesh();
        const bx = this.busX + 0.18;
        const by = 2.38;
        const bz = this.busZ - 1.75;
        bMesh.position.set(bx, by, bz);
        this.scene.add(bMesh);

        this.bullets.push({
          mesh: bMesh,
          x: bx,
          y: by,
          z: bz,
          vx: (Math.random() - 0.5) * 1.4,
          vz: -(this.busSpeed + 86),
          life: 1.35,
        });

        this.sound.playMachineGunShot();
        this.muzzleFlashTimer = 0.045;
        if (this.jungleJeep.muzzleFlash) {
          this.jungleJeep.muzzleFlash.visible = true;
          this.jungleJeep.muzzleFlash.rotation.z = Math.random() * Math.PI;
        }
        if (this.jungleJeep.turretGroup) {
          this.jungleJeep.turretGroup.position.z = 0.12;
        }
      }
    } else {
      const coolRate = this.gunOverheated ? 20 : 24;
      this.gunHeat = Math.max(0, this.gunHeat - coolRate * dt);
      if (this.gunOverheated && this.gunHeat <= 28) {
        this.gunOverheated = false;
        this.showToast('MACHINE GUN COOLED & READY!', 'green');
      }
    }

    // Advance tracer bullets & resolve hits against obstacles, Raiders & arrows
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);

      let consumed = b.life <= 0;

      // 1. Check shootable obstacles
      if (!consumed) {
        for (const obs of this.obstacles) {
          if (obs.hit || !obs.shootable) continue;
          let colX = obs.x;
          let colHalfW = obs.halfW;
          if ((obs.kind === 'fallingTree' || obs.kind === 'ruinPillar') && (obs.fallProgress ?? 0) > 0.55) {
            colX = obs.hitX ?? obs.x;
            colHalfW = obs.kind === 'fallingTree' ? 3.1 : 2.1;
          }
          if (Math.abs(b.x - colX) < colHalfW + 0.65 && Math.abs(b.z - obs.z) < obs.halfL + 1.6) {
            consumed = true;
            obs.hp = (obs.hp ?? 2) - 1;
            this.spawnBurst(b.x, 1.1, obs.z, 0xfde047, 5, 6);
            if (obs.hp <= 0) {
              obs.hit = true;
              obs.knockVx = (colX >= this.busX ? 1 : -1) * THREE.MathUtils.randFloat(9, 15);
              obs.knockVy = THREE.MathUtils.randFloat(7, 11);
              obs.knockVz = -this.busSpeed * 0.35;
              this.obstaclesDestroyed++;
              this.combo = Math.min(5, this.combo + 1);
              const pts = 220 * this.combo;
              this.score += pts;
              this.boostCharge = Math.min(100, this.boostCharge + 10);
              this.sound.playObstacleDestroy();
              this.spawnBurst(colX, 1.2, obs.z, 0xf97316, 16, 11);
              this.showToast(`OBSTACLE BLASTED! +${pts} PTS`, 'green');
            }
            break;
          }
        }
      }

      // 2. Check Raider Buggies
      if (!consumed) {
        for (const r of this.raiders) {
          if (r.knockedOut) continue;
          if (Math.abs(b.x - r.x) < 1.45 && Math.abs(b.z - r.z) < 2.4) {
            consumed = true;
            r.hp -= 1;
            this.spawnBurst(b.x, 1.1, r.z, 0xfef08a, 6, 7);
            if (r.hp <= 0) {
              r.knockedOut = true;
              r.knockVx = (r.x >= this.busX ? 1 : -1) * 14;
              r.knockVy = 9.5;
              r.knockVz = -14;
              r.knockSpin = 7;
              this.raidersDestroyed++;
              this.combo = Math.min(5, this.combo + 1);
              const pts = 600 * this.combo;
              this.score += pts;
              this.boostCharge = Math.min(100, this.boostCharge + 28);
              this.sound.playObstacleDestroy();
              this.spawnBurst(r.x, 1.3, r.z, 0xf97316, 22, 13);
              this.showToast(`RAIDER BUGGY DESTROYED! +${pts} PTS`, 'green');
            }
            break;
          }
        }
      }

      // 3. Shoot incoming flaming arrows out of mid-air!
      if (!consumed) {
        for (let ai = this.arrows.length - 1; ai >= 0; ai--) {
          const a = this.arrows[ai];
          if (Math.abs(b.x - a.x) < 0.85 && Math.abs(b.z - a.z) < 1.5) {
            consumed = true;
            this.spawnBurst(a.x, a.y, a.z, 0xfde047, 8, 6);
            this.scene.remove(a.mesh);
            this.arrows.splice(ai, 1);
            this.score += 75;
            break;
          }
        }
      }

      if (consumed || b.z < this.busZ - 140) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  private spawnRaiderBuggy(): void {
    const z = this.busZ - THREE.MathUtils.randFloat(78, 95);
    const x = this.getRandomBranchXAtZ(z, 1.8);
    const rig = createRaiderBuggy(this.textures);
    rig.root.position.set(x, 0, z);
    this.scene.add(rig.root);

    this.raiders.push({
      mesh: rig.root,
      wheels: rig.wheels,
      turret: rig.turret,
      x,
      z,
      targetX: x,
      speed: Math.max(24, this.busSpeed + 2),
      hp: 6,
      fireTimer: THREE.MathUtils.randFloat(1.4, 2.2),
      weaveTimer: THREE.MathUtils.randFloat(1.4, 2.4),
      knockedOut: false,
      knockVx: 0,
      knockVy: 0,
      knockVz: 0,
      knockSpin: 0,
    });
    this.showToast('ARMED RAIDER BUGGY AHEAD! SHOOT [F] OR DODGE ARROWS!', 'gold');
  }

  private spawnArrowFrom(x: number, y: number, z: number, fromBehind: boolean): void {
    const mesh = createArrowMesh();
    const distZ = Math.max(8, Math.abs(this.busZ - z));
    const closingSpeed = fromBehind ? 18 : this.busSpeed + 8;
    const flightTime = THREE.MathUtils.clamp(distZ / Math.max(18, closingSpeed), 0.35, 1.15);
    const vx = THREE.MathUtils.clamp((this.busX - x) / flightTime, -7.5, 7.5);
    const vz = fromBehind ? -(this.jungleChaserSpeed + 18) : 8;

    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.atan2(vx, vz);
    this.scene.add(mesh);

    this.arrows.push({
      mesh,
      x,
      y,
      z,
      vx,
      vz,
      life: 2.6,
    });
    this.sound.playArrowShoot();
  }

  private updateRaiders(dt: number): void {
    this.raiderSpawnTimer -= dt;
    if (this.raiderSpawnTimer <= 0 && this.raiders.length < 2) {
      this.spawnRaiderBuggy();
      this.raiderSpawnTimer = THREE.MathUtils.randFloat(10, 15);
    }

    for (let i = this.raiders.length - 1; i >= 0; i--) {
      const r = this.raiders[i];
      if (r.knockedOut) {
        r.knockVy -= 24 * dt;
        r.x += r.knockVx * dt;
        const ny = Math.max(0, r.mesh.position.y + r.knockVy * dt);
        r.z += r.knockVz * dt;
        r.mesh.position.set(r.x, ny, r.z);
        r.mesh.rotation.z += r.knockSpin * dt;
        r.mesh.rotation.x += r.knockSpin * 0.7 * dt;
      } else {
        // Keep Raider weaving 20-34m ahead of Jeep
        const leadDist = this.busZ - r.z;
        const targetSpeed =
          leadDist < 19 ? this.busSpeed + 9 : leadDist > 38 ? Math.max(12, this.busSpeed - 6) : this.busSpeed;
        r.speed = THREE.MathUtils.damp(r.speed, targetSpeed, 3.5, dt);
        r.z -= r.speed * dt;

        r.weaveTimer -= dt;
        if (r.weaveTimer <= 0) {
          r.weaveTimer = THREE.MathUtils.randFloat(1.3, 2.3);
          r.targetX = this.getRandomBranchXAtZ(r.z, 1.8);
        }
        r.targetX = this.clampXToRoad(r.targetX, r.z, 1.6);
        r.x = THREE.MathUtils.damp(r.x, r.targetX, 3.8, dt);
        r.x = this.clampXToRoad(r.x, r.z, 1.5);
        r.mesh.position.set(r.x, 0, r.z);

        for (const w of r.wheels) {
          w.rotation.x -= (r.speed * dt) / 0.4;
        }

        // Aim crossbow turret back toward Jeep and shoot flaming arrows!
        r.turret.rotation.y = Math.atan2(this.busX - r.x, Math.max(4, this.busZ - r.z));
        r.fireTimer -= dt;
        if (r.fireTimer <= 0 && leadDist > 12 && leadDist < 54) {
          r.fireTimer = THREE.MathUtils.randFloat(2.3, 3.4);
          this.spawnArrowFrom(r.x, 1.48, r.z + 1.5, false);
        }

        // Ramming collision if Jeep slams into Raider Buggy
        if (Math.abs(this.busX - r.x) < 1.9 && Math.abs(this.busZ - r.z) < 3.9) {
          r.knockedOut = true;
          r.knockVx = (r.x >= this.busX ? 1 : -1) * 14;
          r.knockVy = 8;
          r.knockVz = -this.busSpeed * 0.5;
          r.knockSpin = 6;
          this.spawnBurst(r.x, 1.1, r.z, 0xf97316, 18, 10);
          if (this.invulnTimer <= 0) {
            const dealt = this.takeIntegrityHit(20);
            this.invulnTimer = 0.85;
            if (dealt > 0) {
              this.cameraShake = 0.78;
              this.sound.playCollision(0.9);
              this.showToast(`RAIDER BUGGY CRASH! -${dealt}% INTEGRITY`, 'red');
              if (this.health <= 0) {
                this.triggerGameOver('Wrecked in a collision with an armed Jungle Raider!');
                return;
              }
            }
          }
        }
      }

      if (r.z > this.busZ + 45 || r.z < this.busZ - 180) {
        this.scene.remove(r.mesh);
        this.raiders.splice(i, 1);
      }
    }
  }

  private updateArrows(dt: number): void {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= dt;
      a.x += a.vx * dt;
      a.z += a.vz * dt;
      a.mesh.position.set(a.x, a.y, a.z);

      if (Math.abs(a.x - this.busX) < 1.15 && Math.abs(a.z - this.busZ) < 2.25) {
        this.spawnBurst(a.x, a.y, a.z, 0xf97316, 12, 8);
        this.scene.remove(a.mesh);
        this.arrows.splice(i, 1);

        if (this.invulnTimer <= 0) {
          const dealt = this.takeIntegrityHit(12, 'ARMOR SHIELD DEFLECTED ARROW!');
          this.invulnTimer = 0.55;
          if (dealt > 0) {
            this.cameraShake = 0.52;
            this.sound.playArrowHit();
            this.showToast(`HIT BY RAIDER ARROW! -${dealt}% INTEGRITY`, 'red');
            if (this.health <= 0) {
              this.triggerGameOver('Your 4x4 Expedition Jeep succumbed to Raider arrow fire!');
              return;
            }
          }
        }
        continue;
      }

      if (a.life <= 0 || a.z > this.busZ + 35 || a.z < this.busZ - 140) {
        this.scene.remove(a.mesh);
        this.arrows.splice(i, 1);
      }
    }
  }

  private updateTaxiDestination(dt: number): void {
    this.taxiElapsed += dt;
    this.taxiTimeLeft -= dt;

    const targetZ = this.taxiStageStartZ - this.taxiStageDistance;
    const distLeft = Math.max(0, this.busZ - targetZ);

    // Reveal the checkered 3D Finish Arch when approaching within 260m
    if (distLeft <= 260) {
      this.destArch.visible = true;
      this.destArch.position.set(0, 0, targetZ);
    } else {
      this.destArch.visible = false;
    }

    if (this.busZ <= targetZ) {
      // Arrived at Destination!
      const timeBonus = Math.max(0, Math.round(this.taxiTimeLeft * 120));
      const stagePts = 2500 + timeBonus;
      this.score += stagePts;
      this.health = Math.min(this.maxHealth, this.health + 35);
      this.fuel = Math.min(this.maxFuel, this.fuel + 35);
      this.boostCharge = 100;
      this.sound.playFinishStage();
      this.spawnBurst(this.busX, 2.2, this.busZ - 2, 0x34d399, 28, 12);

      if (this.taxiStage === 1 && (this.taxiBestTime === null || this.taxiElapsed < this.taxiBestTime)) {
        this.taxiBestTime = Number(this.taxiElapsed.toFixed(2));
        try {
          localStorage.setItem('scz_taxi_best_time', String(this.taxiBestTime));
        } catch {
          // ignore
        }
      }

      this.taxiStage++;
      this.taxiStageDistance = 5400 + (this.taxiStage - 1) * 960;
      this.taxiStageStartZ = this.busZ;
      this.taxiElapsed = 0;
      this.taxiTimeLeft = 195 + (this.taxiStage - 1) * 35;
      this.destArch.visible = false;

      this.showToast(
        `ARRIVED! +${stagePts.toLocaleString()} PTS · NEXT: ${this.getTaxiDestinationName(this.taxiStage)}`,
        'green',
      );
      return;
    }

    if (this.taxiTimeLeft <= 0) {
      this.triggerGameOver(
        `Time ran out! Your taxi didn't reach ${this.getTaxiDestinationName(this.taxiStage)} in time.`,
      );
    }
  }

  private updateMissionProgress(): void {
    const targetZ = this.missionLevelTargetZ;
    const distLeft = Math.max(0, this.busZ - targetZ);

    if (distLeft <= 260) {
      this.destArch.visible = true;
      this.destArch.position.set(0, 0, targetZ);
    } else {
      this.destArch.visible = false;
    }

    if (this.busZ <= targetZ) {
      this.pickup.active = false;
      this.pickup.group.visible = false;

      if (this.missionCommutersPicked >= this.missionTargetCommuters) {
        const completedLevel = this.missionLevel;
        const levelBonus = 1500 * completedLevel;
        this.score += levelBonus;
        this.health = Math.min(this.maxHealth, this.health + 30);
        this.fuel = Math.min(this.maxFuel, this.fuel + 35);
        this.boostCharge = 100;
        this.sound.playFinishStage();
        this.spawnBurst(this.busX, 2.2, this.busZ - 2, 0x34d399, 28, 12);

        this.configureMissionLevel(completedLevel + 1, this.busZ);
        this.nextPickupDelay = 2.0;
        this.destArch.visible = false;

        this.showToast(
          `LEVEL ${completedLevel} COMPLETE! +${levelBonus.toLocaleString()} PTS · LEVEL ${this.missionLevel}: PICK UP ${this.missionTargetCommuters} COMMUTERS!`,
          'green',
        );
      } else {
        this.triggerGameOver(
          `Level ${this.missionLevel} failed! Reached the terminal with only ${this.missionCommutersPicked}/${this.missionTargetCommuters} commuters picked up.`,
        );
      }
    }
  }

  private updatePickupZone(dt: number): void {
    if (!this.pickup.active) {
      const distLeft = this.busZ - this.missionLevelTargetZ;
      if (
        this.missionCommutersPicked < this.missionTargetCommuters &&
        distLeft <= 360 &&
        distLeft >= 160
      ) {
        this.nextPickupDelay = Math.min(this.nextPickupDelay, 0.25);
      }
      this.nextPickupDelay -= dt;
      if (this.nextPickupDelay <= 0) {
        this.spawnPickupZone();
      }
      return;
    }

    this.pickup.timer -= dt;

    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 6);
    this.pickup.padMat.opacity = 0.35 + pulse * 0.25;
    this.pickup.beamMat.opacity = 0.12 + pulse * 0.12;
    for (let i = 0; i < this.pickup.passengers.length; i++) {
      this.pickup.passengers[i].rightArm.rotation.z = 2.4 + Math.sin(this.elapsed * 9 + i) * 0.45;
    }

    const inZone =
      Math.abs(this.busX - this.pickup.x) < 2.65 &&
      Math.abs(this.busZ - this.pickup.z) < 7.8;

    const speedKmh = this.busSpeed * 3.6;

    if (inZone && speedKmh < 44) {
      this.pickup.progress = Math.min(1, this.pickup.progress + dt / 0.65);
      if (this.pickup.progress >= 1) {
        const boardedCount = 2;
        this.passengersPicked += boardedCount;
        this.missionCommutersPicked += boardedCount;
        this.missionStopsCompleted++;
        const timeBonus = Math.round(this.pickup.timer * 20);
        const pts = (500 + timeBonus) * this.combo;
        this.score += pts;
        this.combo = Math.min(5, this.combo + 1);
        this.health = Math.min(this.maxHealth, this.health + 18);
        this.fuel = Math.min(this.maxFuel, this.fuel + 8);
        this.boostCharge = Math.min(100, this.boostCharge + 35);

        this.sound.playPickupSuccess();
        this.spawnBurst(this.pickup.x, 1.8, this.pickup.z, 0x34d399, 20, 9);
        const quotaMsg =
          this.missionCommutersPicked >= this.missionTargetCommuters
            ? `QUOTA MET (${this.missionCommutersPicked}/${this.missionTargetCommuters}) — HEAD TO TERMINAL!`
            : `COMMUTERS ${this.missionCommutersPicked}/${this.missionTargetCommuters}`;
        this.showToast(`+${boardedCount} BOARDED! ${quotaMsg} · +${pts} PTS`, 'green');

        this.pickup.active = false;
        this.pickup.group.visible = false;
        this.nextPickupDelay = THREE.MathUtils.randFloat(2.0, 3.6);
        return;
      }
    } else {
      this.pickup.progress = Math.max(0, this.pickup.progress - dt * 1.4);
    }

    if (this.pickup.timer <= 0 || this.busZ < this.pickup.z - 26) {
      this.pickup.active = false;
      this.pickup.group.visible = false;
      this.nextPickupDelay = 2.4;
      this.combo = 1;
      this.health = Math.max(0, this.health - 20);
      this.cameraShake = 0.5;
      this.sound.playCollision(0.7);
      this.showToast('MISSED PASSENGER STOP! -20% INTEGRITY', 'red');

      if (this.health <= 0) {
        const busLabel = this.vehicleType === 'flota' ? 'flota' : 'micro';
        this.triggerGameOver(`Your ${busLabel} lost all integrity after missing stops and traffic hits!`);
      }
    }
  }

  private updatePolicePursuit(dt: number): void {
    // Police ONLY activate when pedestrianStrikes >= 3 (triggered in updateObstacles)
    if (!this.policeActive) {
      return;
    }

    this.policeTimer -= dt;

    // Flashing red & blue lightbar
    this.policeFlashPhase += dt * 12;
    const redOn = Math.floor(this.policeFlashPhase) % 2 === 0;
    this.police.redBeaconMat.emissiveIntensity = redOn ? 3.2 : 0.15;
    this.police.blueBeaconMat.emissiveIntensity = redOn ? 0.15 : 3.2;
    this.police.redLight.intensity = redOn ? 4.5 : 0;
    this.police.blueLight.intensity = redOn ? 0 : 4.5;

    // Balanced Police AI:
    // Top speed ~29.5 m/s (slower than Micro's 33.5 normal / 43 boost!) & less agile in dense traffic
    let blockedAhead = false;
    for (const tr of this.traffic) {
      if (!tr.knockedOut && tr.z < this.policeZ && this.policeZ - tr.z < 12 && Math.abs(tr.x - this.policeX) < 2.2) {
        blockedAhead = true;
        break;
      }
    }

    const policeMaxCap = blockedAhead ? 21.5 : 29.5;
    const desiredSpeed = Math.min(policeMaxCap, Math.max(23, this.busSpeed + 2.5));
    this.policeSpeed = THREE.MathUtils.damp(this.policeSpeed, desiredSpeed, 2.0, dt);
    this.policeZ -= this.policeSpeed * dt;

    if (this.policeZ < this.busZ - 2.0) {
      this.policeZ = THREE.MathUtils.damp(this.policeZ, this.busZ + 2.5, 2.5, dt);
    }

    // Less agile lateral tracking so player can weave through traffic to shake them
    const prevX = this.policeX;
    this.policeX = THREE.MathUtils.damp(this.policeX, this.busX, 2.1, dt);
    this.police.root.position.set(this.policeX, 0, this.policeZ);
    this.police.bodyTilt.rotation.z = -(this.policeX - prevX) * 0.7;

    for (const w of this.police.wheels) {
      w.rotation.x -= (this.policeSpeed * dt) / 0.34;
    }

    // Ramming check
    const dx = Math.abs(this.busX - this.policeX);
    const dz = Math.abs(this.busZ - this.policeZ);
    if (dx < 2.05 && dz < 4.9) {
      this.spawnBurst((this.busX + this.policeX) * 0.5, 1.0, (this.busZ + this.policeZ) * 0.5, 0x38bdf8, 12, 8);
      this.policeZ += 12;
      this.policeSpeed = Math.max(16, this.busSpeed - 9);

      if (this.invulnTimer <= 0) {
        const dealt = this.takeIntegrityHit(18);
        this.invulnTimer = 0.9;
        if (dealt > 0) {
          this.cameraShake = 0.8;
          this.hitstopTimer = 0.045;
          this.sound.playCollision(0.9);
          this.showToast(`POLICÍA BUMP! -${dealt}% INTEGRITY`, 'red');

          if (this.health <= 0) {
            const busLabel = getVehicleOption(this.vehicleType).shortName;
            this.triggerGameOver(`Detained! The Policía Boliviana patrol immobilized your ${busLabel}.`);
            return;
          }
        }
      }
    }

    // Realistic escape: outlast 18s timer OR pull > 58m ahead!
    const distBehind = this.policeZ - this.busZ;
    if (this.policeTimer <= 0 || distBehind > 58) {
      this.policeActive = false;
      this.police.root.visible = false;
      this.policeEscapes++;
      this.pedestrianStrikes = 0;
      this.score += 1000;
      this.boostCharge = Math.min(100, this.boostCharge + 50);
      this.sound.playPoliceEscape();
      this.showToast('OUTMANEUVERED POLICÍA! +1,000 BONUS PTS!', 'green');
    }
  }

  private startJungleChaser(): void {
    this.jungleChaserActive = true;
    this.jungleChaserMaxTimer = 24;
    this.jungleChaserTimer = 24;
    this.jungleChaserZ = this.busZ + 38;
    this.jungleChaserX = this.busX;
    this.jungleChaserSpeed = Math.min(38.5, Math.max(this.busSpeed + 4, 29));
    this.jungleChaser.root.position.set(this.jungleChaserX, 0, this.jungleChaserZ);
    this.jungleChaser.root.visible = true;

    this.sound.playPoliceAlert();
    this.showToast('3:00 AMBUSH! RIVAL 4X4 CHASER IS HUNTING YOU!', 'red');
  }

  private updateJungleChaser(dt: number): void {
    if (!this.jungleChaserActive) {
      if (this.jungleChaserCooldown > 0) {
        this.jungleChaserCooldown -= dt;
      } else if (this.jungleRunTime >= 180) {
        this.startJungleChaser();
      }
      return;
    }

    this.jungleChaserTimer -= dt;

    // Flashing Crimson & Amber 4x4 Roof Beacons
    this.jungleChaserFlashPhase += dt * 13;
    const redOn = Math.floor(this.jungleChaserFlashPhase) % 2 === 0;
    this.jungleChaser.redBeaconMat.emissiveIntensity = redOn ? 3.4 : 0.2;
    this.jungleChaser.blueBeaconMat.emissiveIntensity = redOn ? 0.2 : 3.4;
    this.jungleChaser.redLight.intensity = redOn ? 4.8 : 0;
    this.jungleChaser.blueLight.intensity = redOn ? 0 : 4.8;

    // Avoid jungle boulders/trees/pillars directly in front of the chaser
    let dodgeTargetX = this.busX;
    let blockedAhead = false;
    for (const obs of this.obstacles) {
      if (obs.hit) continue;
      const obsX =
        (obs.kind === 'fallingTree' || obs.kind === 'ruinPillar') && obs.fallTriggered
          ? (obs.hitX ?? obs.x)
          : obs.x;
      const dzAhead = this.jungleChaserZ - obs.z;
      if (dzAhead > -1 && dzAhead < 18 && Math.abs(obsX - this.jungleChaserX) < 2.6) {
        blockedAhead = true;
        dodgeTargetX = obsX >= 0 ? -4.2 : 4.2;
        break;
      }
    }

    const chaserCap = blockedAhead ? 28.5 : 38.5;
    const desiredSpeed = Math.min(chaserCap, Math.max(28, this.busSpeed + 3.2));
    this.jungleChaserSpeed = THREE.MathUtils.damp(this.jungleChaserSpeed, desiredSpeed, 2.2, dt);
    this.jungleChaserZ -= this.jungleChaserSpeed * dt;

    if (this.jungleChaserZ < this.busZ - 2.4) {
      this.jungleChaserZ = THREE.MathUtils.damp(this.jungleChaserZ, this.busZ + 2.6, 2.6, dt);
    }

    const prevX = this.jungleChaserX;
    this.jungleChaserX = THREE.MathUtils.damp(this.jungleChaserX, dodgeTargetX, 3.0, dt);
    this.jungleChaserX = this.clampXToRoad(this.jungleChaserX, this.jungleChaserZ, 1.35);
    this.jungleChaser.root.position.set(this.jungleChaserX, 0, this.jungleChaserZ);
    this.jungleChaser.bodyTilt.rotation.z = -(this.jungleChaserX - prevX) * 0.7;

    for (const w of this.jungleChaser.wheels) {
      w.rotation.x -= (this.jungleChaserSpeed * dt) / 0.44;
    }

    // Rival 4x4 Chaser also shoots flaming arrows forward at the Jeep!
    const distBehindJeep = this.jungleChaserZ - this.busZ;
    this.chaserArrowTimer -= dt;
    if (this.chaserArrowTimer <= 0 && distBehindJeep > 8 && distBehindJeep < 38) {
      this.chaserArrowTimer = THREE.MathUtils.randFloat(2.8, 4.0);
      this.spawnArrowFrom(this.jungleChaserX, 1.85, this.jungleChaserZ - 2.3, true);
    }

    // Ramming impact check against player's Jeep
    const dx = Math.abs(this.busX - this.jungleChaserX);
    const dz = Math.abs(this.busZ - this.jungleChaserZ);
    if (dx < 2.05 && dz < 4.7) {
      this.spawnBurst(
        (this.busX + this.jungleChaserX) * 0.5,
        1.0,
        (this.busZ + this.jungleChaserZ) * 0.5,
        0xf97316,
        14,
        9,
      );
      this.jungleChaserZ += 13;
      this.jungleChaserSpeed = Math.max(18, this.busSpeed - 10);

      if (this.invulnTimer <= 0) {
        const dealt = this.takeIntegrityHit(18);
        this.invulnTimer = 0.9;
        if (dealt > 0) {
          this.cameraShake = 0.85;
          this.hitstopTimer = 0.045;
          this.sound.playCollision(0.95);
          this.showToast(`RIVAL 4X4 RAM! -${dealt}% INTEGRITY`, 'red');

          if (this.health <= 0) {
            this.triggerGameOver('Wrecked in the jungle by the Rival 4x4 Chaser!');
            return;
          }
        }
      }
    }

    const distBehind = this.jungleChaserZ - this.busZ;
    if (this.jungleChaserTimer <= 0 || distBehind > 62) {
      this.jungleChaserActive = false;
      this.jungleChaser.root.visible = false;
      this.jungleChaserEscapes++;
      this.jungleChaserCooldown = 32;
      this.score += 1500;
      this.boostCharge = Math.min(100, this.boostCharge + 60);
      this.sound.playPoliceEscape();
      this.showToast('SHAKEN OFF RIVAL 4X4! +1,500 BONUS PTS!', 'green');
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      const s = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(s);
    }
  }

  private getHazardWarning(): ObstacleKind | null {
    for (const obs of this.obstacles) {
      if (obs.hit) continue;
      const dz = this.busZ - obs.z;
      const checkX =
        (obs.kind === 'fallingTree' || obs.kind === 'ruinPillar') && obs.fallTriggered
          ? (obs.hitX ?? obs.x)
          : obs.x;
      if (dz > 2 && dz < 48 && Math.abs(checkX - this.busX) < 4.4) {
        return obs.kind;
      }
    }
    return null;
  }

  private emitHud(force: boolean): void {
    if (!force && this.disposed) return;

    const inPickupZone =
      this.pickup.active &&
      Math.abs(this.busX - this.pickup.x) < 2.65 &&
      Math.abs(this.busZ - this.pickup.z) < 7.8;

    const taxiTargetZ = this.taxiStageStartZ - this.taxiStageDistance;
    const forkInfo = this.getForkHudInfo();

    const hud: HudState = {
      ...INITIAL_HUD_STATE,
      phase: this.phase,
      gameMode: this.deriveGameMode(),
      vehicleType: this.vehicleType,
      worldType: this.worldType,
      paintJob: this.paintJob,
      sticker: this.sticker,
      cameraMode: this.cameraMode,
      speedKmh: Math.round(this.busSpeed * 3.6),
      health: Math.round(this.health),
      maxHealth: this.maxHealth,
      fuel: Math.round(this.fuel),
      maxFuel: this.maxFuel,
      activeBooster: this.activeBooster,
      activeBoosterTimer: Math.max(0, this.activeBoosterTimer),
      fuelCollected: this.fuelCollected,
      boostersCollected: this.boostersCollected,
      score: Math.floor(this.score),
      highScore: Math.max(this.highScore, Math.floor(this.score)),
      passengersPicked: this.passengersPicked,
      combo: this.combo,
      boostCharge: Math.round(this.boostCharge),
      isBoosting: this.isBoosting,
      hornCooldown: this.hornCooldown / 0.6,
      pickupActive: this.pickup.active,
      pickupTimer: Math.max(0, this.pickup.timer),
      pickupMaxTimer: this.pickup.maxTimer,
      pickupDistance: this.pickup.active ? Math.max(0, Math.round(this.busZ - this.pickup.z)) : 0,
      inPickupZone,
      pickupProgress: this.pickup.progress,
      missionLevel: this.missionLevel,
      missionCommutersPicked: this.missionCommutersPicked,
      missionTargetCommuters: this.missionTargetCommuters,
      missionDistanceLeft: Math.max(0, Math.round(this.busZ - this.missionLevelTargetZ)),
      missionLevelDistance: this.missionLevelDistance,
      missionStopsCompleted: this.missionStopsCompleted,
      taxiStage: this.taxiStage,
      taxiDestinationName: this.getTaxiDestinationName(this.taxiStage),
      taxiDistanceLeft: Math.max(0, Math.round(this.busZ - taxiTargetZ)),
      taxiStageDistance: this.taxiStageDistance,
      taxiElapsed: this.taxiElapsed,
      taxiTimeLeft: Math.max(0, this.taxiTimeLeft),
      taxiBestTime: this.taxiBestTime,
      jungleDistance: this.jungleDistance,
      jungleDodged: this.jungleDodged,
      jungleRunTime: this.jungleRunTime,
      jungleChaserIn: Math.max(0, Math.ceil(180 - this.jungleRunTime)),
      jungleChaserActive: this.jungleChaserActive,
      jungleChaserTimer: Math.max(0, this.jungleChaserTimer),
      jungleChaserDistance: this.jungleChaserActive
        ? Math.max(0, Math.round(this.jungleChaserZ - this.busZ))
        : 0,
      jungleChaserEscapes: this.jungleChaserEscapes,
      hasMachineGun: this.vehicleType === 'jungleJeep',
      gunHeat: Math.round(this.gunHeat),
      gunOverheated: this.gunOverheated,
      obstaclesDestroyed: this.obstaclesDestroyed,
      raidersDestroyed: this.raidersDestroyed,
      ...forkInfo,
      mudSlowActive: this.mudSlowTimer > 0,
      realmName: this.getActiveRealm().name,
      realmIndex: this.realmIdx + 1,
      realmNextIn: Math.max(0, Math.ceil(this.realmDuration - this.realmTimer)),
      weather: this.getActiveWeather(),
      weatherNextIn: Math.max(0, Math.ceil(this.weatherDuration - this.weatherTimer)),
      pedestrianStrikes: this.pedestrianStrikes,
      totalPedestriansHit: this.totalPedestriansHit,
      policeActive: this.policeActive,
      policeTimer: Math.max(0, this.policeTimer),
      policeMaxTimer: this.policeMaxTimer,
      policeDistance: this.policeActive ? Math.max(0, Math.round(this.policeZ - this.busZ)) : 0,
      policeEscapes: this.policeEscapes,
      hazardWarning: this.phase === 'playing' ? this.getHazardWarning() : null,
      statusToast: this.toastText,
      statusToastTone: this.toastTone,
      gameOverReason: this.gameOverReason,
      muted: this.sound.isMuted(),
      radioStation: this.sound.getRadioStation(),
    };

    this.onHudUpdate(hud);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.renderer.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    window.removeEventListener('pointerup', this.handleCanvasPointerUp);

    this.sound.dispose();
    this.textures.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
