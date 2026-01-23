
import { Quality, Equipment, EquipmentType, Stat, Material, ForgeSession, MaterialEffectType } from '../types';
import { STAT_CONFIG, FORGE_ACTIONS } from '../constants';

// --- Helper to check effects ---
const hasEffect = (materials: Material[], type: MaterialEffectType): Material | undefined => {
    return materials.find(m => m.effectType === type);
};

// --- Forge Mini-Game Logic ---

export const createForgeSession = (materials: Material[], playerLevel: number, unlockedTalents: string[] = []): ForgeSession => {
  // 基础锻造耐久 58
  let baseDurability = 58 + (playerLevel * 2); 
  
  // Talent: Durability Boosts
  if (unlockedTalents.includes('t_dur_1')) baseDurability += 10;
  if (unlockedTalents.includes('t_dur_4')) baseDurability += 25;

  let costReductionPct = 0;
  let scoreMult = 1.0;

  // Talent: Score Multiplier
  if (unlockedTalents.includes('t_qual_3')) scoreMult += 0.10;
  if (unlockedTalents.includes('t_qual_5')) scoreMult += 0.25;

  materials.forEach(m => {
    if (m.effectType === 'DURABILITY') baseDurability += m.effectValue;
    if (m.effectType === 'COST_REDUCTION') costReductionPct += m.effectValue;
    if (m.effectType === 'SCORE_MULT') scoreMult += m.effectValue;
  });

  // Cap cost reduction at 80% to prevent 0 cost loop exploits
  costReductionPct = Math.min(0.80, costReductionPct);

  // Capture Talent Stats for efficiency
  const sessionTalents = {
      lightCostReduction: unlockedTalents.includes('t_dur_3') ? 1 : 0,
      heavyCostReductionPct: unlockedTalents.includes('t_dur_2') ? 0.10 : 0,
      heavyProgressBonusPct: unlockedTalents.includes('t_qual_2') ? 0.15 : 0,
      polishScoreBonusPct: unlockedTalents.includes('t_qual_4') ? 0.20 : 0,
      heavyFreeChance: unlockedTalents.includes('t_qual_5') ? 0.10 : 0,
      allCostReductionPct: unlockedTalents.includes('t_dur_5') ? 0.15 : 0,
  };

  return {
    playerLevel,
    maxDurability: baseDurability,
    currentDurability: baseDurability,
    progress: 0,
    qualityScore: 0,
    costModifier: costReductionPct,
    scoreMultiplier: scoreMult,
    quenchCooldown: 0,
    turnCount: 0,
    logs: ['锻造开始！请选择技艺...'],
    status: 'ACTIVE',
    materials,
    activeDebuff: null,
    durabilitySpent: 0,
    momentum: 0,
    polishCount: 0,
    unlockedTalents, // Store the list
    talents: sessionTalents
  };
};

export const executeForgeAction = (session: ForgeSession, action: 'LIGHT' | 'HEAVY' | 'QUENCH' | 'POLISH'): ForgeSession => {
  const newSession = { ...session, turnCount: session.turnCount + 1 };
  if (newSession.quenchCooldown > 0) newSession.quenchCooldown--;
  const levelScale = 1 + (session.playerLevel * 0.03);

  const effAmber = hasEffect(session.materials, 'SPECIAL_START_FREE');
  const effGravity = hasEffect(session.materials, 'SPECIAL_HEAVY_FREE');
  const effEcho = hasEffect(session.materials, 'SPECIAL_LIGHT_MULTI');
  const effMithril = hasEffect(session.materials, 'SPECIAL_LIGHT_SCORE');
  const effImpact = hasEffect(session.materials, 'SPECIAL_HEAVY_PROGRESS');
  const effDiamond = hasEffect(session.materials, 'SPECIAL_POLISH_BUFF');
  const effBlood = hasEffect(session.materials, 'SPECIAL_SPEND_BONUS');
  const effBerserk = hasEffect(session.materials, 'SPECIAL_LOW_DURABILITY');
  const effFrost = hasEffect(session.materials, 'SPECIAL_QUENCH_BUFF');
  const effCrit = hasEffect(session.materials, 'SPECIAL_CRIT');

  // Helper for cost calc
  const calculateCost = (base: number) => {
      let activeCost = base;
      if (session.activeDebuff === 'HARDENED') activeCost *= 2;
      
      // Talent: Global reduction
      if (session.talents.allCostReductionPct > 0) {
          activeCost *= (1 - session.talents.allCostReductionPct);
      }

      // Percentage reduction from materials
      activeCost = Math.floor(activeCost * (1 - session.costModifier));
      
      return Math.max(1, activeCost); // Minimum 1 durability
  };

  if (action === 'POLISH') {
     const [minCost, maxCost] = FORGE_ACTIONS.POLISH.costRange;
     
     // Diminishing Returns: Cost Logic
     // 0: 1x, 1: 1.5x, 2+: 2x
     const costPenaltyMult = session.polishCount === 0 ? 1 : session.polishCount === 1 ? 1.5 : 2;
     
     let rawCost = Math.floor((Math.random() * (maxCost - minCost + 1)) + minCost);
     let actualCost = Math.floor(calculateCost(rawCost) * costPenaltyMult);

     if (effAmber && session.turnCount < effAmber.effectValue) {
        actualCost = 0;
        newSession.logs = [`远古琥珀生效：前${effAmber.effectValue}回合免耗！`, ...newSession.logs];
     }
     
     // Special Polish Logic check
     let isCrit = false;
     if (effCrit && Math.random() < effCrit.effectValue) isCrit = true;

     let berserkBonus = 1.0;
     if (effBerserk && (session.currentDurability / session.maxDurability) < 0.3) berserkBonus = 1.5;

     newSession.currentDurability -= actualCost;
     newSession.durabilitySpent += actualCost;

     if (newSession.currentDurability <= 0) {
        newSession.status = 'FAILURE';
        newSession.logs = [`打磨用力过猛（消耗${actualCost}），神兵破碎了...`, ...session.logs];
        return newSession;
     }

     const riskMultiplier = 1 + (actualCost / maxCost); 
     let baseScore = actualCost * FORGE_ACTIONS.POLISH.scorePerDurability;
     if (effDiamond) baseScore += actualCost * effDiamond.effectValue;

     // Talent: Polish Score Bonus
     if (session.talents.polishScoreBonusPct > 0) {
         baseScore *= (1 + session.talents.polishScoreBonusPct);
     }

     // Diminishing Returns: Score Logic
     // 0: 100%, 1: 80%, 2+: 50%
     const efficiencyMult = session.polishCount === 0 ? 1.0 : session.polishCount === 1 ? 0.8 : 0.5;
     
     // Momentum Logic
     const momentumBonus = 1 + (session.momentum * 0.15); // +15% per stack

     let actualScore = Math.floor(baseScore * session.scoreMultiplier * riskMultiplier * levelScale * berserkBonus * momentumBonus * efficiencyMult);
     if (isCrit) actualScore *= 2;

     newSession.qualityScore += actualScore;
     
     let logStr = `打磨(Lv.${session.polishCount+1})：消耗${actualCost}耐久`;
     if (session.momentum > 0) logStr += ` [重势x${session.momentum}:+${Math.round(session.momentum*15)}%]`;
     if (session.polishCount > 0) logStr += ` [效率${efficiencyMult*100}%]`;
     logStr += `，分 +${actualScore}`;

     if (isCrit) logStr += ' [暴击!]';
     if (berserkBonus > 1) logStr += ' [狂战]';
     
     newSession.logs = [logStr, ...session.logs];
     
     // Consume Momentum and Increment Polish Count
     newSession.momentum = 0;
     newSession.polishCount++;

     if (effBlood) {
         const threshold = 20;
         const prevSpent = session.durabilitySpent;
         const currSpent = newSession.durabilitySpent;
         if (Math.floor(currSpent / threshold) > Math.floor(prevSpent / threshold)) {
             newSession.qualityScore += effBlood.effectValue;
             newSession.logs = [`血燃石生效：耐久消耗达标，额外 +${effBlood.effectValue}分`, ...newSession.logs];
         }
     }
     return newSession;
  }

  if (action === 'QUENCH') {
    if (session.quenchCooldown > 0) return session;
    const heal = Math.floor(session.maxDurability * 0.3);
    newSession.currentDurability = Math.min(newSession.maxDurability, newSession.currentDurability + heal);
    const debuffChanceMult = effFrost ? 0.5 : 1.0;
    const roll = Math.random();
    let logMsg = "";

    if (roll < 0.25 * debuffChanceMult) {
        newSession.activeDebuff = 'HARDENED';
        logMsg = `淬火：耐久+${heal}，但材料变硬了！(下次消耗翻倍)`;
    } else if (roll < 0.50 * debuffChanceMult) {
        newSession.activeDebuff = 'DULLED';
        logMsg = `淬火：耐久+${heal}，但表面钝化！(下次收益减半)`;
    } else if (roll < 0.70 * debuffChanceMult) {
        const penalty = Math.floor(session.qualityScore * 0.2); 
        newSession.qualityScore = Math.max(0, newSession.qualityScore - penalty);
        logMsg = `淬火：耐久+${heal}，但冷却过快导致开裂！(品质 -${penalty})`;
        newSession.activeDebuff = null;
    } else if (roll < 0.90 * debuffChanceMult) {
        const penalty = 20; 
        newSession.progress = Math.max(0, newSession.progress - penalty);
        logMsg = `淬火：耐久+${heal}，但形变回退了！(进度 -${penalty}%)`;
        newSession.activeDebuff = null;
    } else {
        logMsg = `淬火：完美冷却！耐久+${heal}，没有任何副作用。`;
        if (effFrost) logMsg += ' [冰棱镜守护]';
        newSession.activeDebuff = null;
    }
    
    newSession.quenchCooldown = FORGE_ACTIONS.QUENCH.cooldown;
    if (effFrost) newSession.quenchCooldown -= 1;
    newSession.logs = [logMsg, ...session.logs];
    return newSession;
  }

  const config = action === 'LIGHT' ? FORGE_ACTIONS.LIGHT : FORGE_ACTIONS.HEAVY;
  let scoreMult = 1;
  let statusLog = '';

  if (session.activeDebuff === 'DULLED') {
      scoreMult = 0.5;
      statusLog = ' [钝化:收益减半]';
      newSession.activeDebuff = null; 
  } else if (session.activeDebuff === 'HARDENED') {
      // Handled in calculateCost
      statusLog = ' [硬化:消耗翻倍]';
      newSession.activeDebuff = null;
  }

  if (effBerserk && (session.currentDurability / session.maxDurability) < 0.3) {
      scoreMult *= 1.5;
      statusLog += ' [狂战]';
  }

  let baseActionCost = config.baseCost;
  
  // Talent: Action Specific Cost Reductions
  if (action === 'LIGHT' && session.talents.lightCostReduction > 0) {
      baseActionCost -= session.talents.lightCostReduction;
  }
  if (action === 'HEAVY' && session.talents.heavyCostReductionPct > 0) {
      baseActionCost = Math.floor(baseActionCost * (1 - session.talents.heavyCostReductionPct));
  }

  let actualCost = calculateCost(baseActionCost);

  if (effAmber && session.turnCount < effAmber.effectValue) {
      actualCost = 0;
      statusLog += ' [琥珀免耗]';
  } else if (action === 'HEAVY' && effGravity && Math.random() < effGravity.effectValue) {
      actualCost = 0;
      statusLog += ' [浮空石免耗]';
  } else if (action === 'HEAVY' && session.talents.heavyFreeChance > 0 && Math.random() < session.talents.heavyFreeChance) {
      actualCost = 0;
      statusLog += ' [神之手免耗]';
  }

  newSession.currentDurability -= actualCost;
  newSession.durabilitySpent += actualCost;

  if (newSession.currentDurability <= 0) {
    newSession.status = 'FAILURE';
    newSession.logs = [`耐久耗尽！装备崩解了...`, ...session.logs];
    return newSession;
  }

  let bloodstoneBonus = 0;
  if (effBlood) {
      const threshold = 20;
      const prevSpent = session.durabilitySpent;
      const currSpent = newSession.durabilitySpent;
      const steps = Math.floor(currSpent / threshold) - Math.floor(prevSpent / threshold);
      if (steps > 0) {
          bloodstoneBonus = steps * effBlood.effectValue;
          statusLog += ` [血燃+${bloodstoneBonus}]`;
      }
  }

  const [minP, maxP] = config.progressRange;
  let progressGain = Math.floor(Math.random() * (maxP - minP + 1)) + minP;
  
  const [minS, maxS] = config.scoreRange;
  let baseScore = Math.floor(Math.random() * (maxS - minS + 1)) + minS;

  // Talent: Light Score Bonus
  // Fix: Access session.unlockedTalents instead of calling an undefined function
  if (action === 'LIGHT' && session.unlockedTalents && session.unlockedTalents.includes('t_qual_1')) {
      baseScore += 2;
  }

  if (action === 'LIGHT' && effMithril) {
      baseScore *= 1.5;
      progressGain = Math.floor(progressGain * 0.8);
      statusLog += ' [秘银:高分慢锻]';
  }
  if (action === 'HEAVY' && effImpact) {
      progressGain = Math.floor(progressGain * 1.5);
      baseScore *= 0.8;
      statusLog += ' [崩山:速通]';
  }

  // Talent: Heavy Progress Bonus
  if (action === 'HEAVY' && session.talents.heavyProgressBonusPct > 0) {
      progressGain = Math.floor(progressGain * (1 + session.talents.heavyProgressBonusPct));
      statusLog += ' [势大力沉]';
  }

  let hitCount = 1;
  if (action === 'LIGHT' && effEcho && Math.random() < effEcho.effectValue) {
      hitCount = 2;
      statusLog += ' [回响连击!]';
  }

  let totalScoreGain = 0;
  let totalProgressGain = 0;

  for(let i=0; i<hitCount; i++) {
      totalProgressGain += progressGain;
      let hitScore = Math.floor(baseScore * session.scoreMultiplier * levelScale * scoreMult);
      if (effCrit && Math.random() < effCrit.effectValue) {
          hitScore *= 2;
          statusLog += ' [暴击!]';
      }
      totalScoreGain += hitScore;
  }

  // Momentum Logic: Heavy adds 1 stack
  if (action === 'HEAVY') {
      newSession.momentum += 1;
      statusLog += ` [重势+1]`;
  }

  totalScoreGain += bloodstoneBonus;
  newSession.progress = Math.min(100, newSession.progress + totalProgressGain);
  newSession.qualityScore += totalScoreGain;

  newSession.logs = [`${config.name}：进度 +${totalProgressGain}%，品质分 +${totalScoreGain}${statusLog}`, ...session.logs];

  return newSession;
};

export const completeForgeSession = (session: ForgeSession): ForgeSession => {
    return {
        ...session,
        status: 'SUCCESS',
        logs: [`锻造完成！最终品质分：${session.qualityScore}`, ...session.logs]
    };
};

export const finalizeForge = (session: ForgeSession, type: EquipmentType, playerLevel: number): Equipment => {
  const { qualityScore, materials } = session;
  const id = Math.random().toString(36).substr(2, 9);
  
  // 1. Quality Determination (Weighted by Materials)
  // Sum Range: 3 (3x Common) to 9 (3x Rare)
  const totalMaterialQuality = materials.reduce((sum, m) => sum + m.quality, 0);
  let resultQuality = Quality.Common;
  const roll = Math.random();

  if (totalMaterialQuality <= 4) {
      // 3-4 (Common heavy): 90% Common, 10% Refined
      // Boost chance if score is high (>600)
      const threshold = qualityScore > 600 ? 0.2 : 0.1;
      resultQuality = roll < threshold ? Quality.Refined : Quality.Common;
  } else if (totalMaterialQuality <= 7) {
      // 5-7 (Mixed): 20% Common, 70% Refined, 10% Rare
      // Penalize low score (<300)
      if (qualityScore < 300) {
           resultQuality = roll < 0.5 ? Quality.Common : Quality.Refined;
      } else {
           if (roll < 0.2) resultQuality = Quality.Common;
           else if (roll < 0.9) resultQuality = Quality.Refined;
           else resultQuality = Quality.Rare;
      }
  } else {
      // 8-9 (Rare heavy): 10% Refined, 90% Rare
      // Penalize low score (<500)
      if (qualityScore < 500) {
           resultQuality = roll < 0.4 ? Quality.Refined : Quality.Rare;
      } else {
           resultQuality = roll < 0.1 ? Quality.Refined : Quality.Rare;
      }
  }

  // 2. Stat Count Determination
  let statCount = 2; // Default for Common
  const scoreFactor = Math.min(1, qualityScore / 2000); // Normalizes score impact

  if (resultQuality === Quality.Refined) {
      // Refined: 2-3 stats. Base chance 30%, boosted by score.
      if (Math.random() < (0.3 + scoreFactor * 0.5)) statCount = 3;
  } else if (resultQuality === Quality.Rare) {
      // Rare: 3-4 stats. Base 3. Chance for 4 boosted by score.
      statCount = 3;
      if (Math.random() < (0.3 + scoreFactor * 0.5)) statCount = 4;
  }

  // 3. Stat Type Selection
  const weaponOrder: Stat['type'][] = ['ATK', 'CRIT', 'LIFESTEAL'];
  const armorOrder: Stat['type'][] = ['HP', 'DEF', 'LIFESTEAL'];
  const basePool = type === 'WEAPON' ? weaponOrder : armorOrder;

  // Filter out Lifesteal for Common quality
  let pool = [...basePool];
  if (resultQuality === Quality.Common) {
      pool = pool.filter(s => s !== 'LIFESTEAL');
  }

  const selectedStats: Stat[] = [];
  const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < statCount; i++) {
      const typeKey = shuffledPool[i % shuffledPool.length];
      
      // 4. Calculate Stat Values
      // Formula: Base * QualityMult * (1 + ScoreBonus)
      
      // Base: Exponential growth with level. 10 * 1.3^(Level-1)
      const levelBase = 10 * Math.pow(1.3, playerLevel - 1);
      
      const qMult = resultQuality === Quality.Common ? 1.0 : resultQuality === Quality.Refined ? 1.3 : 1.6;
      const scoreBonus = Math.min(0.5, qualityScore / 2000); // Cap bonus at 50%
      
      const config = STAT_CONFIG[typeKey];
      // Normalize config base relative to ATK (10) for ratio scaling
      const statRatio = config.base / 10;
      
      let finalVal = 0;

      if (typeKey === 'CRIT') {
          // Crit: Quality Base + Score Scaling
          const baseCrit = resultQuality * 5; // 5, 10, 15
          finalVal = baseCrit + (qualityScore / 250);
          finalVal = Math.min(35, finalVal);
      } else if (typeKey === 'LIFESTEAL') {
          // Lifesteal: Hard cap 5
          const baseLS = resultQuality === Quality.Rare ? 2 : 1;
          finalVal = baseLS + (qualityScore / 1500);
          finalVal = Math.min(5, finalVal);
      } else {
          // HP, ATK, DEF
          finalVal = levelBase * statRatio * qMult * (1 + scoreBonus);
          // Add randomness +/- 10%
          finalVal *= (0.9 + Math.random() * 0.2);
      }

      selectedStats.push({
          type: typeKey,
          label: config.label,
          value: Math.floor(Math.max(1, finalVal)),
          suffix: config.suffix
      });
  }
  
  // Sort stats for consistent display order
  const sortOrder = ['HP', 'ATK', 'DEF', 'CRIT', 'LIFESTEAL'];
  selectedStats.sort((a, b) => sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type));

  const namePrefix = resultQuality === Quality.Rare ? '传说' : (resultQuality === Quality.Refined ? '精炼' : '普通的');
  const typeName = type === 'WEAPON' ? '神兵' : '护甲';
  // Value calculation: quality * base + materials value
  const saleValue = Math.floor(qualityScore * 1.2) + (totalMaterialQuality * 50);

  // Combat Durability: Scale slightly with score, mostly defined by quality
  const baseDurability = resultQuality === Quality.Rare ? 300 : (resultQuality === Quality.Refined ? 180 : 100);
  const combatDurability = Math.floor(baseDurability * (1 + (qualityScore/5000)));

  return {
    id,
    name: `${namePrefix}${typeName}`,
    type,
    quality: resultQuality,
    stats: selectedStats,
    value: saleValue,
    materialsUsed: materials.map(m => m.quality),
    score: qualityScore,
    maxDurability: combatDurability,
    currentDurability: combatDurability
  };
};

export const generateEquipment = (type: EquipmentType, materials: Quality[], playerLevel: number = 1, isBossDrop: boolean = false): Equipment => {
    const fakeMaterials: Material[] = materials.map((q, i) => ({
        id: `fake_${i}`,
        quality: q,
        name: '未知材料',
        price: 0,
        effectType: 'DURABILITY',
        effectValue: 0,
        description: ''
    }));

    const totalVal = materials.reduce((a,b) => a+b, 0);
    // Simulate score based on expected quality
    const simulatedScore = totalVal * (isBossDrop ? 150 : 80) * (0.8 + Math.random() * 0.4);
    
    // Minimal mock session
    const mockSession: ForgeSession = {
        playerLevel,
        maxDurability: 100, currentDurability: 100, progress: 100, 
        qualityScore: Math.floor(simulatedScore), 
        costModifier: 0, scoreMultiplier: 1, 
        quenchCooldown: 0, turnCount: 0, logs: [], status: 'SUCCESS',
        materials: fakeMaterials,
        activeDebuff: null,
        durabilitySpent: 0,
        momentum: 0,
        polishCount: 0,
        unlockedTalents: [],
        talents: {
             lightCostReduction: 0, heavyCostReductionPct: 0, heavyProgressBonusPct: 0,
             polishScoreBonusPct: 0, heavyFreeChance: 0, allCostReductionPct: 0
        }
    };
    return finalizeForge(mockSession, type, playerLevel);
};

export const generateBlacksmithReward = (targetScore: number, type: EquipmentType, playerLevel: number): Equipment => {
    // Infer likely materials from target score for reasonable quality gen
    let estimatedQuality = Quality.Common;
    if (targetScore > 800) estimatedQuality = Quality.Rare;
    else if (targetScore > 300) estimatedQuality = Quality.Refined;

    const fakeMaterials: Material[] = Array(3).fill(null).map((_, i) => ({
        id: `gift_${i}`,
        quality: estimatedQuality,
        name: '神秘金属',
        price: 0,
        effectType: 'DURABILITY',
        effectValue: 0,
        description: '铁匠的馈赠'
    }));

    const variance = 0.9 + Math.random() * 0.2;
    const finalScore = Math.floor(targetScore * variance);

    const mockSession: ForgeSession = {
        playerLevel,
        maxDurability: 100, currentDurability: 100, progress: 100, 
        qualityScore: finalScore, 
        costModifier: 0, scoreMultiplier: 1, 
        quenchCooldown: 0, turnCount: 0, logs: [], status: 'SUCCESS',
        materials: fakeMaterials,
        activeDebuff: null,
        durabilitySpent: 0,
        momentum: 0,
        polishCount: 0,
        unlockedTalents: [],
        talents: {
             lightCostReduction: 0, heavyCostReductionPct: 0, heavyProgressBonusPct: 0,
             polishScoreBonusPct: 0, heavyFreeChance: 0, allCostReductionPct: 0
        }
    };

    return finalizeForge(mockSession, type, playerLevel);
};
