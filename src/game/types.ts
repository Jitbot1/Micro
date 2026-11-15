export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'city' | 'flota' | 'taxi' | 'jungle';

export type VehicleType = 'micro' | 'flota' | 'taxi' | 'jungleJeep';

export type WorldType = 'city' | 'mountain' | 'jungle';

export type PaintJobId = 'camba' | 'andino' | 'carnaval' | 'selva' | 'sunburst' | 'obsidian';

export type StickerId = 'horn_ok' | 'condor' | 'chola' | 'chili' | 'camba_star' | 'none';

export type CameraMode = 'chase' | 'driver';

export type TrafficKind = 'sedan' | 'taxi' | 'trufi' | 'pickup' | 'motorbike' | 'torito';

export type ObstacleKind =
  | 'cow'
  | 'pedestrian'
  | 'vendor'
  | 'dog'
  | 'boulder'
  | 'fallingTree'
  | 'caiman'
  | 'ruinPillar'
  | 'rollingLog'
  | 'wreckedCar'
  | 'mudPit'
  | 'barricade';

export type BoosterKind = 'nitro' | 'shield' | 'magnet';

export type RoadPickupKind = 'fuelCan' | BoosterKind;

export type WeatherKind = 'sunny' | 'dusty' | 'heavyRain' | 'monsoon' | 'blizzard';

export type RadioStation = 'off' | 'bollywood' | 'techno' | 'street';

export interface HudState {
  phase: GamePhase;
  gameMode: GameMode;
  vehicleType: VehicleType;
  worldType: WorldType;
  paintJob: PaintJobId;
  sticker: StickerId;
  cameraMode: CameraMode;
  speedKmh: number;
  health: number;
  maxHealth: number;
  fuel: number;
  maxFuel: number;
  activeBooster: BoosterKind | null;
  activeBoosterTimer: number;
  fuelCollected: number;
  boostersCollected: number;
  score: number;
  highScore: number;
  passengersPicked: number;
  combo: number;
  boostCharge: number; // 0 to 100
  isBoosting: boolean;
  hornCooldown: number; // 0 to 1

  // Passenger pickup & level mission objective (city & flota)
  pickupActive: boolean;
  pickupTimer: number;
  pickupMaxTimer: number;
  pickupDistance: number;
  inPickupZone: boolean;
  pickupProgress: number; // 0 to 1 boarding progress
  missionLevel: number;
  missionCommutersPicked: number;
  missionTargetCommuters: number;
  missionDistanceLeft: number;
  missionLevelDistance: number;
  missionStopsCompleted: number;

  // Taxi Express destination race
  taxiStage: number;
  taxiDestinationName: string;
  taxiDistanceLeft: number;
  taxiStageDistance: number;
  taxiElapsed: number;
  taxiTimeLeft: number;
  taxiBestTime: number | null;

  // Jungle Jeep expedition, machine gun & 3-minute chaser
  jungleDistance: number;
  jungleDodged: number;
  jungleRunTime: number;
  jungleChaserIn: number;
  jungleChaserActive: boolean;
  jungleChaserTimer: number;
  jungleChaserDistance: number;
  jungleChaserEscapes: number;
  hasMachineGun: boolean;
  gunHeat: number; // 0 to 100
  gunOverheated: boolean;
  obstaclesDestroyed: number;
  raidersDestroyed: number;

  // Branching Fork Paths (all modes)
  forkActive: boolean;
  forkPhase: 'none' | 'approaching' | 'inside';
  forkDistance: number;
  forkLeftLabel: string;
  forkRightLabel: string;
  forkLeftBonus: string;
  forkRightBonus: string;
  forkChosenSide: 'left' | 'right' | null;
  mudSlowActive: boolean;

  // Dynamic Realm & Cycling Weather Shifts
  realmName: string;
  realmIndex: number;
  realmNextIn: number;
  weather: WeatherKind;
  weatherNextIn: number;

  // Police pursuit (triggered at 3 pedestrian strikes in city/flota/taxi)
  pedestrianStrikes: number; // 0 to 3
  totalPedestriansHit: number;
  policeActive: boolean;
  policeTimer: number;
  policeMaxTimer: number;
  policeDistance: number;
  policeEscapes: number;

  // Alerts
  hazardWarning: ObstacleKind | null;
  statusToast: string | null;
  statusToastTone: 'gold' | 'green' | 'red' | 'blue';
  gameOverReason: string;
  muted: boolean;
  radioStation: RadioStation;
}

export const ROAD_WIDTH = 15.6; // 4 wide Santa Cruz avenue lanes x 3.9m
export const LANE_WIDTH = 3.9;
export const LANE_CENTERS = [-5.85, -1.95, 1.95, 5.85] as const;
export const OPPOSING_LANES = [-5.85, -1.95] as const;
export const FORWARD_LANES = [1.95, 5.85] as const;
export const SIDEWALK_WIDTH = 6.8;
export const CHUNK_LENGTH = 60;
export const NUM_CHUNKS = 7;

export const INITIAL_HUD_STATE: HudState = {
  phase: 'title',
  gameMode: 'city',
  vehicleType: 'micro',
  worldType: 'city',
  paintJob: 'camba',
  sticker: 'horn_ok',
  cameraMode: 'chase',
  speedKmh: 0,
  health: 100,
  maxHealth: 100,
  fuel: 100,
  maxFuel: 100,
  activeBooster: null,
  activeBoosterTimer: 0,
  fuelCollected: 0,
  boostersCollected: 0,
  score: 0,
  highScore: 0,
  passengersPicked: 0,
  combo: 1,
  boostCharge: 100,
  isBoosting: false,
  hornCooldown: 0,
  pickupActive: false,
  pickupTimer: 20,
  pickupMaxTimer: 20,
  pickupDistance: 0,
  inPickupZone: false,
  pickupProgress: 0,
  missionLevel: 1,
  missionCommutersPicked: 0,
  missionTargetCommuters: 4,
  missionDistanceLeft: 1620,
  missionLevelDistance: 1620,
  missionStopsCompleted: 0,
  taxiStage: 1,
  taxiDestinationName: 'AEROPUERTO VIRU VIRU',
  taxiDistanceLeft: 5400,
  taxiStageDistance: 5400,
  taxiElapsed: 0,
  taxiTimeLeft: 195,
  taxiBestTime: null,
  jungleDistance: 0,
  jungleDodged: 0,
  jungleRunTime: 0,
  jungleChaserIn: 180,
  jungleChaserActive: false,
  jungleChaserTimer: 0,
  jungleChaserDistance: 0,
  jungleChaserEscapes: 0,
  hasMachineGun: false,
  gunHeat: 0,
  gunOverheated: false,
  obstaclesDestroyed: 0,
  raidersDestroyed: 0,
  forkActive: false,
  forkPhase: 'none',
  forkDistance: 0,
  forkLeftLabel: '',
  forkRightLabel: '',
  forkLeftBonus: '',
  forkRightBonus: '',
  forkChosenSide: null,
  mudSlowActive: false,
  realmName: 'SANTA CRUZ NOON',
  realmIndex: 1,
  realmNextIn: 80,
  weather: 'sunny',
  weatherNextIn: 45,
  pedestrianStrikes: 0,
  totalPedestriansHit: 0,
  policeActive: false,
  policeTimer: 0,
  policeMaxTimer: 18,
  policeDistance: 0,
  policeEscapes: 0,
  hazardWarning: null,
  statusToast: null,
  statusToastTone: 'gold',
  gameOverReason: '',
  muted: false,
  radioStation: 'off',
};
