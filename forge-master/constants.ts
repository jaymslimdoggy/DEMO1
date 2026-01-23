
import { Material, Quality, Blessing, TalentNode } from './types';

export const MATERIALS: Material[] = [
  // ... (Existing Materials unchanged, copying mostly for context) ...
  // 黑铁系列
  { id: 'm_iron_1', quality: Quality.Common, name: '粗糙黑铁', price: 10, effectType: 'DURABILITY', effectValue: 15, description: '耐久上限 +15' },
  { id: 'm_iron_2', quality: Quality.Refined, name: '坚硬黑铁', price: 100, effectType: 'DURABILITY', effectValue: 30, description: '耐久上限 +30' },
  { id: 'm_iron_3', quality: Quality.Rare, name: '深渊玄铁', price: 2000, effectType: 'DURABILITY', effectValue: 60, description: '耐久上限 +60' },

  // 云铜系列 (Updated to Percentage)
  { id: 'm_copper_1', quality: Quality.Common, name: '轻云铜', price: 15, effectType: 'COST_REDUCTION', effectValue: 0.10, description: '耐久消耗 -10%' },
  { id: 'm_copper_2', quality: Quality.Refined, name: '流风铜', price: 150, effectType: 'COST_REDUCTION', effectValue: 0.20, description: '耐久消耗 -20%' },
  { id: 'm_copper_3', quality: Quality.Rare, name: '天界秘铜', price: 2500, effectType: 'COST_REDUCTION', effectValue: 0.35, description: '耐久消耗 -35%' },

  // 赤金系列
  { id: 'm_gold_1', quality: Quality.Common, name: '微光赤金', price: 20, effectType: 'SCORE_MULT', effectValue: 0.05, description: '品质倍率 +5%' },
  { id: 'm_gold_2', quality: Quality.Refined, name: '耀斑赤金', price: 200, effectType: 'SCORE_MULT', effectValue: 0.15, description: '品质倍率 +15%' },
  { id: 'm_gold_3', quality: Quality.Rare, name: '日核纯金', price: 3000, effectType: 'SCORE_MULT', effectValue: 0.40, description: '品质倍率 +40%' },

  // --- 特殊副本材料 ---
  { id: 's_gravity', quality: Quality.Refined, name: '浮空石', price: 500, effectType: 'SPECIAL_HEAVY_FREE', effectValue: 0.25, description: '重锤25%概率不消耗耐久', isDungeonOnly: true },
  { id: 's_echo', quality: Quality.Refined, name: '回响晶', price: 500, effectType: 'SPECIAL_LIGHT_MULTI', effectValue: 0.30, description: '轻击30%概率双倍效果', isDungeonOnly: true },
  { id: 's_cat_eye', quality: Quality.Rare, name: '幸运猫眼', price: 3000, effectType: 'SPECIAL_CRIT', effectValue: 0.10, description: '所有操作10%概率品质暴击', isDungeonOnly: true },
  { id: 's_mithril', quality: Quality.Refined, name: '秘银丝', price: 400, effectType: 'SPECIAL_LIGHT_SCORE', effectValue: 1.5, description: '轻击得分+50% / 进度-20%', isDungeonOnly: true },
  { id: 's_impact', quality: Quality.Refined, name: '崩山岩', price: 400, effectType: 'SPECIAL_HEAVY_PROGRESS', effectValue: 1.5, description: '重锤进度+50% / 得分-20%', isDungeonOnly: true },
  { id: 's_diamond', quality: Quality.Rare, name: '金刚尘', price: 2500, effectType: 'SPECIAL_POLISH_BUFF', effectValue: 5, description: '打磨每消耗1耐久 得分+5', isDungeonOnly: true },
  { id: 's_blood', quality: Quality.Rare, name: '血燃石', price: 2800, effectType: 'SPECIAL_SPEND_BONUS', effectValue: 50, description: '每消耗20耐久 品质分+50', isDungeonOnly: true },
  { id: 's_berserk', quality: Quality.Refined, name: '狂战合金', price: 600, effectType: 'SPECIAL_LOW_DURABILITY', effectValue: 1.5, description: '耐久<30%时 得分+50%', isDungeonOnly: true },
  { id: 's_frost', quality: Quality.Refined, name: '冰棱镜', price: 450, effectType: 'SPECIAL_QUENCH_BUFF', effectValue: 1, description: '淬火CD-1 负面概率减半', isDungeonOnly: true },
  { id: 's_amber', quality: Quality.Rare, name: '远古琥珀', price: 3500, effectType: 'SPECIAL_START_FREE', effectValue: 3, description: '前3次操作不消耗耐久', isDungeonOnly: true },
];

export const STAT_CONFIG = {
  HP: { label: '生命值', suffix: '', base: 50, scale: 25 },
  ATK: { label: '攻击', suffix: '', base: 10, scale: 6 },
  DEF: { label: '防御', suffix: '', base: 5, scale: 4 },
  CRIT: { label: '暴击率', suffix: '%', base: 0, scale: 0 }, 
  LIFESTEAL: { label: '吸血', suffix: '%', base: 0, scale: 0 }, 
};

export const INITIAL_GOLD = 500; 

// Dungeon Balance
export const DUNGEON_CONFIG = {
    SUPPLY_COST: 40,
    BASE_BAG_SIZE: 15,
    DURABILITY_LOSS_PER_HIT: 1,
    REPAIR_COST_PER_POINT: 2,
    STARVATION_HP_LOSS_PCT: 0.05,
    STARVATION_ATK_LOSS_PCT: 0.2,
    STREAK_BONUS_PCT: 0.05, // 5% bonus per floor streak
};

export const BLESSINGS: Blessing[] = [
    // Tier 1 (Cost ~200)
    { name: '轻盈行囊', tier: 1, type: 'BAG_EXPANSION', value: 3, description: '背包容量 +3' },
    { name: '微弱守护', tier: 1, type: 'DURABILITY_SAVE', value: 0.20, description: '20% 概率不消耗耐久' },
    { name: '干粮储备', tier: 1, type: 'SUPPLY_SAVE', value: 6, description: '每6层免除一次补给消耗' },
    
    // Tier 2 (Cost ~800)
    { name: '虚空口袋', tier: 2, type: 'BAG_EXPANSION', value: 5, description: '背包容量 +5' },
    { name: '坚固符文', tier: 2, type: 'DURABILITY_SAVE', value: 0.35, description: '35% 概率不消耗耐久' },
    { name: '绝境生机', tier: 2, type: 'LOW_HP_RECOVERY', value: 0.30, description: '战后血量<30%时 回复30%' },

    // Tier 3 (Cost ~2000)
    { name: '神之口袋', tier: 3, type: 'BAG_EXPANSION', value: 8, description: '背包容量 +8' },
    { name: '永恒精金', tier: 3, type: 'DURABILITY_SAVE', value: 0.50, description: '50% 概率不消耗耐久' },
    { name: '凤凰涅槃', tier: 3, type: 'LOW_HP_RECOVERY', value: 0.50, description: '战后血量<30%时 回复50%' },
];

export const FORGE_ACTIONS = {
  LIGHT: {
    name: '轻击',
    baseCost: 8, 
    progressRange: [10, 15], 
    scoreRange: [20, 35], 
    description: '低耗稳妥，微调进度'
  },
  HEAVY: {
    name: '重锤',
    baseCost: 20, 
    progressRange: [25, 40], 
    scoreRange: [60, 100], 
    description: '高耗激进，积攒重势'
  },
  QUENCH: {
    name: '淬火',
    baseDurabilityGain: 0, 
    scorePenaltyPercent: 0, 
    cooldown: 3, 
    description: '恢复30%耐久，大概率获得随机负面效果'
  },
  POLISH: {
    name: '打磨',
    costRange: [5, 20], 
    scorePerDurability: 12, 
    description: '消耗重势，大幅增分。次数越多效果越差'
  }
};

export const TALENT_TREE: TalentNode[] = [
    // Tier 1 (Level 1)
    { id: 't_dur_1', branch: 'DURABILITY', tier: 1, name: '铁砧加固 I', description: '锻造初始耐久 +10', cost: 500, reqLevel: 1 },
    { id: 't_qual_1', branch: 'QUALITY', tier: 1, name: '精准锤击 I', description: '【轻击】基础分数 +2', cost: 500, reqLevel: 1 },
    { id: 't_exp_1', branch: 'EXPLORATION', tier: 1, name: '扩容背囊 I', description: '战利品背包 +2 格', cost: 500, reqLevel: 1 },

    // Tier 2 (Level 3)
    { id: 't_dur_2', branch: 'DURABILITY', tier: 2, parentId: 't_dur_1', name: '省力杠杆', description: '【重锤】耐久消耗 -10%', cost: 1500, reqLevel: 3 },
    { id: 't_qual_2', branch: 'QUALITY', tier: 2, parentId: 't_qual_1', name: '势大力沉', description: '【重锤】进度获取 +15%', cost: 1500, reqLevel: 3 },
    { id: 't_exp_2', branch: 'EXPLORATION', tier: 2, parentId: 't_exp_1', name: '行军干粮 I', description: '初始补给上限 +2 (且自带2份)', cost: 1500, reqLevel: 3 },

    // Tier 3 (Level 5)
    { id: 't_dur_3', branch: 'DURABILITY', tier: 3, parentId: 't_dur_2', name: '冷却槽优化', description: '【轻击】耐久消耗 -1', cost: 4000, reqLevel: 5 },
    { id: 't_qual_3', branch: 'QUALITY', tier: 3, parentId: 't_qual_2', name: '独具匠心 I', description: '最终品质倍率 +10%', cost: 4000, reqLevel: 5 },
    { id: 't_exp_3', branch: 'EXPLORATION', tier: 3, parentId: 't_exp_2', name: '贪婪之握', description: '战利品背包 +3 格', cost: 4000, reqLevel: 5 },

    // Tier 4 (Level 10)
    { id: 't_dur_4', branch: 'DURABILITY', tier: 4, parentId: 't_dur_3', name: '合金砧座', description: '锻造初始耐久 +25', cost: 10000, reqLevel: 10 },
    { id: 't_qual_4', branch: 'QUALITY', tier: 4, parentId: 't_qual_3', name: '光辉打磨', description: '【打磨】基础分数 +20%', cost: 10000, reqLevel: 10 },
    { id: 't_exp_4', branch: 'EXPLORATION', tier: 4, parentId: 't_exp_3', name: '后勤专家', description: '补给价格 -20%，上限 +5', cost: 10000, reqLevel: 10 },

    // Tier 5 (Level 15)
    { id: 't_dur_5', branch: 'DURABILITY', tier: 5, parentId: 't_dur_4', name: '永动结构', description: '所有操作消耗 -15%', cost: 30000, reqLevel: 15 },
    { id: 't_qual_5', branch: 'QUALITY', tier: 5, parentId: 't_qual_4', name: '神之手', description: '品质倍率 +25%，重锤10%概率免耗', cost: 30000, reqLevel: 15 },
    { id: 't_exp_5', branch: 'EXPLORATION', tier: 5, parentId: 't_exp_4', name: '虚空行囊', description: '背包 +5 格，副本金币 +20%', cost: 30000, reqLevel: 15 },
];
