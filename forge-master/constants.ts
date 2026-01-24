
import { Material, Quality, Blessing, TalentNode } from './types';

export const MATERIALS: Material[] = [
  // --- 基础材料 (Base) ---
  { id: 'm_iron_1', quality: Quality.Common, name: '粗糙黑铁', price: 10, effectType: 'DURABILITY', effectValue: 15, description: '耐久上限 +15' },
  { id: 'm_iron_2', quality: Quality.Refined, name: '坚硬黑铁', price: 100, effectType: 'DURABILITY', effectValue: 30, description: '耐久上限 +30' },
  { id: 'm_iron_3', quality: Quality.Rare, name: '深渊玄铁', price: 2000, effectType: 'DURABILITY', effectValue: 60, description: '耐久上限 +60', isRareBase: true },

  { id: 'm_copper_1', quality: Quality.Common, name: '轻云铜', price: 15, effectType: 'COST_REDUCTION', effectValue: 0.05, description: '耐久消耗 -5%' },
  { id: 'm_copper_2', quality: Quality.Refined, name: '流风铜', price: 150, effectType: 'COST_REDUCTION', effectValue: 0.10, description: '耐久消耗 -10%' },
  { id: 'm_copper_3', quality: Quality.Rare, name: '天界秘铜', price: 2500, effectType: 'COST_REDUCTION', effectValue: 0.15, description: '耐久消耗 -15%', isRareBase: true },

  { id: 'm_gold_1', quality: Quality.Common, name: '微光赤金', price: 20, effectType: 'SCORE_MULT', effectValue: 0.10, description: '品质倍率 +10%' },
  { id: 'm_gold_2', quality: Quality.Refined, name: '耀斑赤金', price: 200, effectType: 'SCORE_MULT', effectValue: 0.25, description: '品质倍率 +25%' },
  { id: 'm_gold_3', quality: Quality.Rare, name: '日核纯金', price: 3000, effectType: 'SCORE_MULT', effectValue: 0.50, description: '品质倍率 +50%', isRareBase: true },

  // --- 🔥 红温流 (Overheat) ---
  // A. 熔岩之心 (Magma Core) - 温度转分
  { id: 's_magma_1', quality: Quality.Common, name: '微热煤块', price: 300, effectType: 'SPECIAL_HEAT_TO_SCORE', effectValue: 0.5, description: '每 1°C 温度提供 +0.5 基础分', isDungeonOnly: true },
  { id: 's_magma_2', quality: Quality.Refined, name: '地心熔岩', price: 800, effectType: 'SPECIAL_HEAT_TO_SCORE', effectValue: 1.0, description: '每 1°C 温度提供 +1 基础分', isDungeonOnly: true },
  { id: 's_magma_3', quality: Quality.Rare, name: '太阳内核', price: 2500, effectType: 'SPECIAL_HEAT_TO_SCORE', effectValue: 2.0, description: '每 1°C +2 分，满温时额外 +50', isDungeonOnly: true },
  
  // B. 黑曜石皮 (Obsidian Skin) - 抗热/免碎
  { id: 's_obsidian_1', quality: Quality.Common, name: '焦黑石片', price: 300, effectType: 'SPECIAL_HEAT_RESIST', effectValue: 0.5, description: '过热区消耗惩罚减半(200%->150%)', isDungeonOnly: true },
  { id: 's_obsidian_2', quality: Quality.Refined, name: '硬化黑曜石', price: 800, effectType: 'SPECIAL_HEAT_RESIST', effectValue: 0.8, description: '过热区消耗惩罚大幅降低(->120%)', isDungeonOnly: true },
  { id: 's_obsidian_3', quality: Quality.Rare, name: '永恒黑甲', price: 2500, effectType: 'SPECIAL_HEAT_RESIST', effectValue: 1.0, description: '无视过热惩罚，且非打磨不碎裂', isDungeonOnly: true },

  // --- ❄️ 控温流 (Cryo) ---
  // A. 冰棱镜 (Frost Prism) - 淬火专注
  { id: 's_frost_1', quality: Quality.Common, name: '碎冰块', price: 300, effectType: 'SPECIAL_QUENCH_FOCUS', effectValue: 0.5, description: '淬火 50% 概率 +1 专注', isDungeonOnly: true },
  { id: 's_frost_2', quality: Quality.Refined, name: '冰晶石', price: 800, effectType: 'SPECIAL_QUENCH_FOCUS', effectValue: 1.0, description: '淬火必定 +1 专注', isDungeonOnly: true },
  { id: 's_frost_3', quality: Quality.Rare, name: '极寒棱镜', price: 2500, effectType: 'SPECIAL_QUENCH_FOCUS', effectValue: 2.0, description: '淬火必定 +2 专注', isDungeonOnly: true },

  // B. 秘银丝 (Mithril Wire) - 轻击不升温
  { id: 's_mithril_1', quality: Quality.Common, name: '低纯秘银', price: 300, effectType: 'SPECIAL_LIGHT_NO_HEAT', effectValue: 0.5, description: '轻击升温减半，但消耗 +1 耐久', isDungeonOnly: true },
  { id: 's_mithril_2', quality: Quality.Refined, name: '高纯秘银', price: 800, effectType: 'SPECIAL_LIGHT_NO_HEAT', effectValue: 1.0, description: '轻击不升温，但消耗 +1 耐久', isDungeonOnly: true },
  { id: 's_mithril_3', quality: Quality.Rare, name: '超导秘银', price: 2500, effectType: 'SPECIAL_LIGHT_NO_HEAT', effectValue: 2.0, description: '轻击完全不升温且无额外消耗', isDungeonOnly: true },

  // --- ⚡ 连击流 (Combo) ---
  // A. 回响晶 (Echo Crystal) - 连击回血回气
  { id: 's_echo_1', quality: Quality.Common, name: '共鸣碎片', price: 300, effectType: 'SPECIAL_COMBO_REGEN', effectValue: 3, description: '触发【连击】时恢复 3 耐久', isDungeonOnly: true },
  { id: 's_echo_2', quality: Quality.Refined, name: '回响晶体', price: 800, effectType: 'SPECIAL_COMBO_REGEN', effectValue: 5.5, description: '连击回 5 耐久，50% 概率 +1 专注', isDungeonOnly: true },
  { id: 's_echo_3', quality: Quality.Rare, name: '天籁之音', price: 2500, effectType: 'SPECIAL_COMBO_REGEN', effectValue: 8.9, description: '连击回 8 耐久，必定 +1 专注', isDungeonOnly: true },

  // B. 疾风之羽 (Gale Feather) - 轻击双重打击 (NEW)
  { id: 's_feather_1', quality: Quality.Common, name: '飞鸟之羽', price: 300, effectType: 'SPECIAL_LIGHT_MULTIHIT', effectValue: 0.2, description: '轻击 20% 概率触发双重打击(收益x2)', isDungeonOnly: true },
  { id: 's_feather_2', quality: Quality.Refined, name: '狮鹫翎毛', price: 800, effectType: 'SPECIAL_LIGHT_MULTIHIT', effectValue: 0.4, description: '轻击 40% 概率触发双重打击(收益x2)', isDungeonOnly: true },
  { id: 's_feather_3', quality: Quality.Rare, name: '风神之翼', price: 2500, effectType: 'SPECIAL_LIGHT_MULTIHIT', effectValue: 0.6, description: '轻击 60% 概率双重打击，且连击必双倍', isDungeonOnly: true },

  // --- 🩸 献祭流 (Blood) ---
  // A. 血燃石 (Blood Stone) - 卖血
  { id: 's_blood_1', quality: Quality.Common, name: '凝血块', price: 300, effectType: 'SPECIAL_BLOOD_PACT', effectValue: 0.2, description: '每损失 10 耐久，倍率 +2%', isDungeonOnly: true },
  { id: 's_blood_2', quality: Quality.Refined, name: '沸腾血石', price: 800, effectType: 'SPECIAL_BLOOD_PACT', effectValue: 0.35, description: '每损失 10 耐久，倍率 +3.5%', isDungeonOnly: true },
  { id: 's_blood_3', quality: Quality.Rare, name: '魔神之血', price: 2800, effectType: 'SPECIAL_BLOOD_PACT', effectValue: 0.5, description: '每损10耐久+5%倍率，濒死翻倍', isDungeonOnly: true },

  // B. 远古琥珀 (Ancient Amber) - 复活
  { id: 's_amber_1', quality: Quality.Common, name: '树脂化石', price: 300, effectType: 'SPECIAL_DEATH_SAVE', effectValue: 10, description: '抵挡一次碎裂，并恢复 10 耐久', isDungeonOnly: true },
  { id: 's_amber_2', quality: Quality.Refined, name: '完整琥珀', price: 800, effectType: 'SPECIAL_DEATH_SAVE', effectValue: 30, description: '抵挡一次碎裂，并恢复 30 耐久', isDungeonOnly: true },
  { id: 's_amber_3', quality: Quality.Rare, name: '时光琥珀', price: 3500, effectType: 'SPECIAL_DEATH_SAVE', effectValue: 100, description: '抵挡碎裂，回满50%耐久且温度归0', isDungeonOnly: true },

  // --- 🎲 特殊 (Special) ---
  // A. 金刚尘 (Diamond Dust) - 打磨
  { id: 's_diamond_1', quality: Quality.Common, name: '金刚砂', price: 300, effectType: 'SPECIAL_POLISH_BUFF', effectValue: 1, description: '【打磨】基础分 +50', isDungeonOnly: true },
  { id: 's_diamond_2', quality: Quality.Refined, name: '工业钻', price: 800, effectType: 'SPECIAL_POLISH_BUFF', effectValue: 2, description: '【打磨】30% 概率不消耗耐久', isDungeonOnly: true },
  { id: 's_diamond_3', quality: Quality.Rare, name: '星辰之尘', price: 2500, effectType: 'SPECIAL_POLISH_BUFF', effectValue: 3, description: '【打磨】60% 概率免耗，分+100', isDungeonOnly: true },

  // B. 幸运猫眼 (Cat's Eye) - 奇迹
  { id: 's_cat_1', quality: Quality.Common, name: '玻璃珠', price: 300, effectType: 'SPECIAL_MIRACLE', effectValue: 0.05, description: '5% 触发奇迹(免单+双倍分)', isDungeonOnly: true },
  { id: 's_cat_2', quality: Quality.Refined, name: '蛋白石', price: 800, effectType: 'SPECIAL_MIRACLE', effectValue: 0.10, description: '10% 触发奇迹(免单+双倍分)', isDungeonOnly: true },
  { id: 's_cat_3', quality: Quality.Rare, name: '命运之眼', price: 3000, effectType: 'SPECIAL_MIRACLE', effectValue: 0.15, description: '15% 触发奇迹，且额外回复 5 耐久', isDungeonOnly: true },
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
    STREAK_BONUS_PCT: 0.05, 
};

export const BLESSINGS: Blessing[] = [
    { name: '轻盈行囊', tier: 1, type: 'BAG_EXPANSION', value: 3, description: '背包容量 +3' },
    { name: '微弱守护', tier: 1, type: 'DURABILITY_SAVE', value: 0.20, description: '20% 概率不消耗耐久' },
    { name: '干粮储备', tier: 1, type: 'SUPPLY_SAVE', value: 6, description: '每6层免除一次补给消耗' },
    { name: '虚空口袋', tier: 2, type: 'BAG_EXPANSION', value: 5, description: '背包容量 +5' },
    { name: '坚固符文', tier: 2, type: 'DURABILITY_SAVE', value: 0.35, description: '35% 概率不消耗耐久' },
    { name: '绝境生机', tier: 2, type: 'LOW_HP_RECOVERY', value: 0.30, description: '战后血量<30%时 回复30%' },
    { name: '神之口袋', tier: 3, type: 'BAG_EXPANSION', value: 8, description: '背包容量 +8' },
    { name: '永恒精金', tier: 3, type: 'DURABILITY_SAVE', value: 0.50, description: '50% 概率不消耗耐久' },
    { name: '凤凰涅槃', tier: 3, type: 'LOW_HP_RECOVERY', value: 0.50, description: '战后血量<30%时 回复50%' },
];

// Heat Configuration
export const HEAT_CONFIG = {
    OPTIMAL_START: 30,
    OVERHEAT_START: 80,
    MAX_TEMP: 100,
    
    // Zone Multipliers
    LOW_SCORE_MULT: 0.8,
    LOW_COST_MULT: 1.0,
    
    OPTIMAL_SCORE_MULT: 1.5,
    OPTIMAL_COST_MULT: 1.0,
    
    OVERHEAT_SCORE_MULT: 2.5,
    OVERHEAT_COST_MULT: 2.0, // Punishing cost
};

// Reduced progress to extend gameplay loop
export const FORGE_ACTIONS = {
  LIGHT: {
    name: '轻击',
    baseCost: 5,
    heatAdd: 10,
    progressRange: [8, 12], 
    scoreRange: [15, 25], 
    description: '小幅升温，积攒专注'
  },
  HEAVY: {
    name: '重锤',
    baseCost: 15, 
    heatAdd: 25,
    progressRange: [12, 18], 
    scoreRange: [50, 80], 
    description: '大幅升温，消耗专注'
  },
  QUENCH: {
    name: '淬火',
    baseCost: 0,
    durabilityRestore: 20, 
    heatReduce: 35,
    description: '降低温度，恢复耐久'
  },
  POLISH: {
    name: '打磨',
    baseCostMax: 10, // Initial Max Cost
    costGrowth: 5,   // Max cost increases by 5 per use
    baseScore: 150,  // Base Score per hit
    scoreGrowth: 50, // Score increases by 50 per use
    description: '消耗随机耐久，风险递增'
  }
};

export const TALENT_TREE: TalentNode[] = [
    // --- 坚韧系 (DURABILITY) ---
    { id: 't_dur_1', branch: 'DURABILITY', tier: 1, name: '铁砧加固', description: '锻造初始耐久 +15', cost: 500, reqLevel: 1 },
    { id: 't_dur_2', branch: 'DURABILITY', tier: 2, parentId: 't_dur_1', name: '热能护盾', description: '【过热】状态下，重锤的额外耐久消耗减半', cost: 1500, reqLevel: 3 },
    { id: 't_dur_3', branch: 'DURABILITY', tier: 3, parentId: 't_dur_2', name: '深度淬火', description: '【淬火】回复量 +10，且有20%概率不消耗行动次数', cost: 4000, reqLevel: 5 },
    { id: 't_dur_4', branch: 'DURABILITY', tier: 4, parentId: 't_dur_3', name: '合金结构', description: '锻造初始耐久 +40', cost: 10000, reqLevel: 10 },
    { id: 't_dur_5', branch: 'DURABILITY', tier: 5, parentId: 't_dur_4', name: '永恒熔炉', description: '所有操作的耐久消耗永久 -15%', cost: 30000, reqLevel: 15 },

    // --- 技艺系 (QUALITY) ---
    { id: 't_qual_1', branch: 'QUALITY', tier: 1, name: '学徒感知', description: '【轻击】命中可额外获得 2 点品质分', cost: 500, reqLevel: 1 },
    { id: 't_qual_2', branch: 'QUALITY', tier: 2, parentId: 't_qual_1', name: '余震掌控', description: '触发【重锤连击】时，下一次轻击必定暴击(2倍得分)', cost: 1500, reqLevel: 3 },
    { id: 't_qual_3', branch: 'QUALITY', tier: 3, parentId: 't_qual_2', name: '心流状态', description: '专注上限 +1，且每层专注提供额外 2% 暴击率', cost: 4000, reqLevel: 5 },
    { id: 't_qual_4', branch: 'QUALITY', tier: 4, parentId: 't_qual_3', name: '完美温控', description: '【最佳】温度区间的得分倍率从 1.5x 提升至 1.8x', cost: 10000, reqLevel: 10 },
    { id: 't_qual_5', branch: 'QUALITY', tier: 5, parentId: 't_qual_4', name: '神匠之手', description: '最终结算时，品质倍率额外 +30%', cost: 30000, reqLevel: 15 },

    // --- 探险系 (EXPLORATION) ---
    { id: 't_exp_1', branch: 'EXPLORATION', tier: 1, name: '大容量背包', description: '战利品背包 +3 格', cost: 500, reqLevel: 1 },
    // Moved Logistics Up
    { id: 't_exp_2', branch: 'EXPLORATION', tier: 2, parentId: 't_exp_1', name: '战地后勤', description: '初始补给上限 +5，且每次进入副本自带 3 份补给', cost: 1500, reqLevel: 3 },
    { id: 't_exp_3', branch: 'EXPLORATION', tier: 3, parentId: 't_exp_2', name: '宝物嗅觉', description: '副本中发现稀有材料的概率提升 20%', cost: 4000, reqLevel: 5 },
    { id: 't_exp_4', branch: 'EXPLORATION', tier: 4, parentId: 't_exp_3', name: '精打细算', description: '副本补给价格降低 35%', cost: 10000, reqLevel: 8 },
    { id: 't_exp_5', branch: 'EXPLORATION', tier: 5, parentId: 't_exp_4', name: '点金术', description: '出售装备和材料获得的金币 +25%', cost: 30000, reqLevel: 15 },
];
