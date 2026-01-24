
export enum Quality {
  Common = 1,
  Refined = 2,
  Rare = 3
}

export type MaterialEffectType = 
  | 'DURABILITY' 
  | 'COST_REDUCTION' 
  | 'SCORE_MULT'
  | 'SPECIAL_HEAT_TO_SCORE'
  | 'SPECIAL_HEAT_RESIST'
  | 'SPECIAL_QUENCH_FOCUS'
  | 'SPECIAL_LIGHT_NO_HEAT'
  | 'SPECIAL_COMBO_REGEN'
  | 'SPECIAL_FOCUS_BUFF'
  | 'SPECIAL_BLOOD_PACT'
  | 'SPECIAL_DEATH_SAVE'
  | 'SPECIAL_POLISH_BUFF'
  | 'SPECIAL_MIRACLE'
  | 'SPECIAL_LIGHT_MULTIHIT'; // New Effect

export interface Material {
  id: string;
  quality: Quality;
  name: string;
  price: number;
  effectType: MaterialEffectType;
  effectValue: number;
  description: string;
  isDungeonOnly?: boolean;
  isRareBase?: boolean; // New flag to hide rare base mats from static shop
}

export type EquipmentType = 'WEAPON' | 'ARMOR';

export interface Stat {
  type: string;
  label: string;
  value: number;
  suffix: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  quality: Quality;
  stats: Stat[];
  value: number;
  materialsUsed: Quality[];
  score: number;
  maxDurability: number;
  currentDurability: number;
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
  unlockedTalents: string[];
  maxScore: number;
  baseStats: {
    HP: number;
    ATK: number;
    DEF: number;
    CRIT: number;
    LIFESTEAL: number;
  };
  // Shop State - 3 Slots
  shopSlots: {
      item: Material;
      soldOut: boolean;
  }[];
  itemsSoldSinceRestock: number;
  hasSeenForgeTutorial?: boolean;
}

export interface ForgeSession {
  playerLevel: number;
  maxDurability: number;
  currentDurability: number;
  progress: number;
  qualityScore: number;
  costModifier: number;
  scoreMultiplier: number;
  turnCount: number;
  logs: string[];
  status: 'ACTIVE' | 'SUCCESS' | 'FAILURE';
  materials: Material[];
  activeDebuff: string | null;
  durabilitySpent: number;
  temperature: number;
  focus: number;
  maxFocus: number;
  polishCount: number;
  comboActive: boolean;
  deathSaveUsed: boolean;
  unlockedTalents: string[];
  talents: {
      lightCostReduction: number;
      heavyCostReductionPct: number;
      heavyProgressBonusPct: number;
      polishScoreBonusPct: number;
      heavyFreeChance: number;
      allCostReductionPct: number;
  };
}

export type BlessingTier = 1 | 2 | 3;

export interface Blessing {
  name: string;
  tier: BlessingTier;
  type: 'BAG_EXPANSION' | 'DURABILITY_SAVE' | 'SUPPLY_SAVE' | 'LOW_HP_RECOVERY';
  value: number;
  description: string;
}

export interface TalentNode {
  id: string;
  branch: 'DURABILITY' | 'QUALITY' | 'EXPLORATION';
  tier: number;
  name: string;
  description: string;
  cost: number;
  reqLevel: number;
  parentId?: string;
}

export interface EventOption {
  label: string;
  style?: string;
  disabled?: boolean;
  action: () => void;
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
  supplies: number;
  maxBagCapacity: number;
  blessing: Blessing | null;
  streak: number;
  starvationDebuff: boolean;
  log: string[];
  isDead: boolean;
  currentEvent: string;
  lastHealDepth: number;
  lastEventResult: {
    icon: string;
    title: string;
    desc: string;
    color: string;
  } | null;
  isProcessing?: boolean;
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
