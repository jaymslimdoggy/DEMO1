
export enum Quality {
  Common = 1,
  Refined = 2,
  Rare = 3
}

export const QualityNames = {
  [Quality.Common]: '普通',
  [Quality.Refined]: '精炼',
  [Quality.Rare]: '传说'
};

export const QualityColors = {
  [Quality.Common]: 'white',
  [Quality.Refined]: '#4ade80',
  [Quality.Rare]: '#facc15'
};

export type MaterialEffectType = 
  | 'DURABILITY' | 'COST_REDUCTION' | 'SCORE_MULT' 
  | 'SPECIAL_HEAVY_FREE' | 'SPECIAL_LIGHT_MULTI' | 'SPECIAL_CRIT' 
  | 'SPECIAL_LIGHT_SCORE' | 'SPECIAL_HEAVY_PROGRESS' | 'SPECIAL_POLISH_BUFF' 
  | 'SPECIAL_SPEND_BONUS' | 'SPECIAL_LOW_DURABILITY' | 'SPECIAL_QUENCH_BUFF' 
  | 'SPECIAL_START_FREE';

export interface Material {
  id: string;
  quality: Quality;
  name: string;
  price: number;
  effectType: MaterialEffectType;
  effectValue: number;
  description: string;
  isDungeonOnly?: boolean;
}

export interface Stat {
  type: 'HP' | 'ATK' | 'DEF' | 'CRIT' | 'LIFESTEAL';
  label: string;
  value: number;
  suffix: string;
}

export type EquipmentType = 'WEAPON' | 'ARMOR';

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  quality: Quality;
  stats: Stat[];
  value: number;
  materialsUsed: Quality[];
  score?: number;
  maxDurability: number;     // New: Max durability for combat
  currentDurability: number; // New: Current durability
}

export interface Player {
  level: number;
  exp: number;
  maxExp: number;
  gold: number;
  materials: Material[];
  inventory: Equipment[];
  equippedWeapon: Equipment | null;
  equippedArmor: Equipment | null;
  maxDungeonDepth: number;
  unlockedFloors: number[];
  unlockedTalents: string[]; // New: List of unlocked talent IDs
  baseStats: {
    HP: number;
    ATK: number;
    DEF: number;
    CRIT: number;
    LIFESTEAL: number;
  };
}

// New: Blessing System
export type BlessingTier = 1 | 2 | 3;
export type BlessingType = 'DURABILITY_SAVE' | 'SUPPLY_SAVE' | 'LOW_HP_RECOVERY' | 'BAG_EXPANSION';

export interface Blessing {
  name: string;
  tier: BlessingTier;
  type: BlessingType;
  value: number; // Percentage or Flat value
  description: string;
}

// New: Talent System
export type TalentBranch = 'DURABILITY' | 'QUALITY' | 'EXPLORATION';

export interface TalentNode {
  id: string;
  branch: TalentBranch;
  tier: number;
  name: string;
  description: string;
  cost: number;
  reqLevel: number;
  parentId?: string; // Optional parent ID for dependency
}

// New: Event Choices
export interface EventOption {
  label: string;
  action: () => void;
  style?: string; // CSS class
  disabled?: boolean;
}

export interface DungeonState {
  depth: number;
  currentHP: number;
  maxHP: number;
  loot: {
    gold: number;
    materials: Material[];
    inventory: Equipment[];
    exp: number;
  };
  supplies: number; // New: Current supplies
  maxBagCapacity: number; // New: 15 + blessing
  blessing: Blessing | null; // New: Active blessing
  streak: number; // New: Floors cleared in this run
  starvationDebuff: boolean; // New: Has ATK been reduced?
  
  log: string[];
  isDead: boolean;
  isProcessing?: boolean;
  currentEvent: string;
  lastHealDepth: number;
  lastEventResult?: { icon: string; title: string; desc: string; color: string } | null;
  
  // Interactive Event
  activeChoice?: {
      title: string;
      desc: string;
      options: EventOption[];
  };

  battle?: {
    monsterName: string;
    monsterMaxHP: number;
    monsterHP: number;
    monsterATK: number;
    isStarted?: boolean;
    isFinished: boolean;
    victory: boolean;
  };
}

export type ForgeDebuff = 'HARDENED' | 'DULLED';

export interface ForgeSession {
  playerLevel: number;
  maxDurability: number;
  currentDurability: number;
  progress: number;
  qualityScore: number;
  costModifier: number; // Now represents total percentage reduction (e.g., 0.2 for 20%)
  scoreMultiplier: number;
  quenchCooldown: number;
  turnCount: number;
  logs: string[];
  status: 'ACTIVE' | 'SUCCESS' | 'FAILURE';
  materials: Material[];
  activeDebuff: ForgeDebuff | null;
  durabilitySpent: number;
  momentum: number; // New: Stacks of "Heavy Momentum"
  polishCount: number; // New: Number of times Polished
  
  // Talent snapshots for session
  talents: {
      lightCostReduction: number; // Flat
      heavyCostReductionPct: number; // Pct
      heavyProgressBonusPct: number; // Pct
      polishScoreBonusPct: number; // Pct
      heavyFreeChance: number; // Pct
      allCostReductionPct: number; // Pct
  }
}
