
import { Quality, Equipment, EquipmentType, Stat, Material, ForgeSession, MaterialEffectType } from '../types';
import { STAT_CONFIG, FORGE_ACTIONS, HEAT_CONFIG } from '../constants';

// --- Helper to aggregate effects ---
// Returns sum of effectValue for all matching types.
const getEffectStrength = (materials: Material[], type: MaterialEffectType): number => {
    return materials.reduce((sum, m) => m.effectType === type ? sum + m.effectValue : sum, 0);
};

// Returns true if any material has this effect
const hasEffect = (materials: Material[], type: MaterialEffectType): boolean => {
    return materials.some(m => m.effectType === type);
};

// --- Helper: Determine Heat Zone ---
export const getHeatZone = (temp: number) => {
    if (temp < HEAT_CONFIG.OPTIMAL_START) return 'LOW';
    if (temp >= HEAT_CONFIG.OVERHEAT_START) return 'OVERHEAT';
    return 'OPTIMAL';
};

// --- Helper: Calculate Cost (Exported for UI) ---
export const getForgeActionCost = (session: ForgeSession, action: 'LIGHT' | 'HEAVY' | 'QUENCH' | 'POLISH'): number => {
    // Basic logic mirroring executeForgeAction's cost calculation part
    if (action === 'QUENCH') return 0; 
    
    // Polish Logic
    if (action === 'POLISH') {
         // Star Dust (Rare) now gives 60% free chance, doesn't use Focus.
         // Cost is always calculated as potential max, but chance applies in execution.
         // We return the "Potential" max cost here for UI range.

         const baseMax = FORGE_ACTIONS.POLISH.baseCostMax || 10;
         const growth = FORGE_ACTIONS.POLISH.costGrowth || 5;
         return baseMax + (session.polishCount * growth); 
    }

    const config = action === 'LIGHT' ? FORGE_ACTIONS.LIGHT : FORGE_ACTIONS.HEAVY;
    
    // Combo Logic: Next Light Hit is Free
    if (action === 'LIGHT' && session.comboActive) {
        return 0;
    }

    // Zone & Heat Resist Logic
    const zone = getHeatZone(session.temperature);
    let zoneCostMult = 1.0;
    
    // Talent: Heat Shield (t_dur_2) 
    const hasTalentHeatShield = action === 'HEAVY' && session.unlockedTalents.includes('t_dur_2');
    
    // Material: Obsidian Skin (Heat Resist)
    const heatResistStrength = getEffectStrength(session.materials, 'SPECIAL_HEAT_RESIST');

    if (zone === 'LOW') zoneCostMult = HEAT_CONFIG.LOW_COST_MULT;
    else if (zone === 'OPTIMAL') zoneCostMult = HEAT_CONFIG.OPTIMAL_COST_MULT;
    else {
        // Overheat
        let overheatMult = HEAT_CONFIG.OVERHEAT_COST_MULT; // 2.0
        
        // Apply Obsidian Skin Reduction (Common: 0.5 -> 1.5x, Refined: 0.8 -> 1.2x, Rare: 1.0 -> 1.0x)
        // Logic: Reduction from penalty. Penalty is +1.0 (total 2.0). 
        // 0.5 strength -> remove 0.5 penalty -> 1.5. 
        // 1.0 strength -> remove 1.0 penalty -> 1.0.
        const penalty = HEAT_CONFIG.OVERHEAT_COST_MULT - 1;
        const reduction = Math.min(penalty, heatResistStrength); 
        overheatMult -= reduction;

        if (hasTalentHeatShield) overheatMult = Math.min(overheatMult, 1.5); // Talent cap at 1.5 if not lower
        
        zoneCostMult = Math.max(1.0, overheatMult);
    }

    // Base Cost
    let baseActionCost = config.baseCost;
    
    // Material: Mithril Wire (Light No Heat - Common/Refined adds cost)
    if (action === 'LIGHT') {
        const mithrilStrength = getEffectStrength(session.materials, 'SPECIAL_LIGHT_NO_HEAT');
        if (mithrilStrength > 0 && mithrilStrength < 2.0) {
            baseActionCost += 1; // Penalty for low tier mithril
        }
    }

    // Debuff
    let activeCost = baseActionCost;
    if (session.activeDebuff === 'HARDENED') activeCost *= 2;
    
    // Global Reductions
    if (session.unlockedTalents.includes('t_dur_5')) {
        activeCost *= 0.85; // -15%
    }
    
    // Material Reduction (Cloud Copper)
    activeCost = Math.floor(activeCost * (1 - session.costModifier));
    activeCost = Math.max(1, activeCost);

    // Final
    return Math.floor(activeCost * zoneCostMult);
};

// --- Forge Mini-Game Logic ---

export const createForgeSession = (materials: Material[], playerLevel: number, unlockedTalents: string[] = []): ForgeSession => {
  let baseDurability = 58 + (playerLevel * 2); 
  let maxFocus = 3; // Default Cap

  // Talents: Durability
  if (unlockedTalents.includes('t_dur_1')) baseDurability += 15;
  if (unlockedTalents.includes('t_dur_4')) baseDurability += 40;
  
  // Talents: Focus
  if (unlockedTalents.includes('t_qual_3')) maxFocus += 1; 

  let costReductionPct = 0;
  let scoreMult = 1.0;
  let baseScore = 0;

  // Material Stats
  materials.forEach(m => {
    if (m.effectType === 'DURABILITY') baseDurability += m.effectValue;
    if (m.effectType === 'COST_REDUCTION') costReductionPct += m.effectValue;
    if (m.effectType === 'SCORE_MULT') scoreMult += m.effectValue;
    
    // Mind Crystal (Focus Buff) - Integer part adds to Cap
    if (m.effectType === 'SPECIAL_FOCUS_BUFF') maxFocus += Math.floor(m.effectValue);

    // Calculate Base Score based on Quality
    if (m.quality === Quality.Common) baseScore += 50;
    else if (m.quality === Quality.Refined) baseScore += 100;
    else if (m.quality === Quality.Rare) baseScore += 200;
  });

  // Cap Cost Reduction
  costReductionPct = Math.min(0.80, costReductionPct);

  // Talents: Score Mult
  if (unlockedTalents.includes('t_qual_5')) scoreMult += 0.30;

  const sessionTalents = {
      lightCostReduction: 0, 
      heavyCostReductionPct: 0, 
      heavyProgressBonusPct: 0, 
      polishScoreBonusPct: 0, 
      heavyFreeChance: 0, 
      allCostReductionPct: unlockedTalents.includes('t_dur_5') ? 0.15 : 0,
  };

  return {
    playerLevel,
    maxDurability: baseDurability,
    currentDurability: baseDurability,
    progress: 0,
    qualityScore: baseScore, 
    costModifier: costReductionPct,
    scoreMultiplier: scoreMult,
    turnCount: 0,
    logs: [`锻造开始！基础材料提供品质分: ${baseScore}`],
    status: 'ACTIVE',
    materials,
    activeDebuff: null,
    durabilitySpent: 0,
    temperature: 0, 
    focus: 0,
    maxFocus,    
    polishCount: 0,
    comboActive: false, // Renamed
    deathSaveUsed: false,
    unlockedTalents, 
    talents: sessionTalents
  };
};

export const executeForgeAction = (session: ForgeSession, action: 'LIGHT' | 'HEAVY' | 'QUENCH' | 'POLISH'): ForgeSession => {
  const newSession = { ...session, turnCount: session.turnCount + 1 };
  const levelScale = 1 + (session.playerLevel * 0.03);

  // --- 1. Cat's Eye (Miracle) Check at start ---
  const miracleStrength = getEffectStrength(session.materials, 'SPECIAL_MIRACLE');
  let isMiracle = false;
  if (miracleStrength > 0 && Math.random() < miracleStrength) {
      isMiracle = true;
  }
  
  // Calculate Cost
  let actualCost = getForgeActionCost(session, action);
  if (isMiracle) actualCost = 0;

  // --- 2. POLISH Logic ---
  if (action === 'POLISH') {
     let freeChance = 0;
     let diamondBonusScore = 0;
     
     // Calculate Polish Effects
     session.materials.forEach(m => {
         if (m.effectType === 'SPECIAL_POLISH_BUFF') {
             if (m.quality === Quality.Common) diamondBonusScore += 50;
             else if (m.quality === Quality.Refined) freeChance += 0.3;
             else if (m.quality === Quality.Rare) {
                 freeChance += 0.6;
                 diamondBonusScore += 100;
             }
         }
     });

     // Apply Free Chance
     if (actualCost > 0 && Math.random() < freeChance) {
         actualCost = 0;
         newSession.logs = [`[金刚尘] 完美的切面！本次打磨不消耗耐久。`, ...session.logs];
     } else if (actualCost > 0) {
         // Standard Random Cost
         const baseMax = FORGE_ACTIONS.POLISH.baseCostMax || 10;
         const growth = FORGE_ACTIONS.POLISH.costGrowth || 5;
         const currentMaxCost = baseMax + (newSession.polishCount * growth);
         actualCost = Math.floor(Math.random() * (currentMaxCost + 1));
     }

     if (actualCost >= newSession.currentDurability) {
         newSession.currentDurability -= actualCost; // Go negative/zero
     } else {
         newSession.currentDurability -= actualCost;
     }
     
     let scoreBase = FORGE_ACTIONS.POLISH.baseScore || 150;
     const scoreGrowth = FORGE_ACTIONS.POLISH.scoreGrowth || 50;
     let roundScore = scoreBase + (newSession.polishCount * scoreGrowth);
     
     // Apply Diamond Bonus Score
     roundScore += diamondBonusScore;

     let totalScore = Math.floor(roundScore * session.scoreMultiplier * levelScale);
     if (isMiracle) totalScore *= 2;

     newSession.qualityScore += totalScore;
     newSession.polishCount++;

     let logStr = `打磨完成 (消耗${actualCost})：品质 +${totalScore}`;
     if (isMiracle) logStr += ' [奇迹!]';
     
     newSession.logs = [logStr, ...session.logs];
     // Skip to common post-processing (Death check)
  }

  // --- 3. QUENCH Logic ---
  else if (action === 'QUENCH') {
    const heatRed = FORGE_ACTIONS.QUENCH.heatReduce;
    let restoreAmount = FORGE_ACTIONS.QUENCH.durabilityRestore || 20;
    
    // Frost Prism (Quench Focus)
    const frostStrength = getEffectStrength(session.materials, 'SPECIAL_QUENCH_FOCUS');
    if (frostStrength > 0) {
        let focusGain = 0;
        if (frostStrength >= 2.0) focusGain = 2; // Rare
        else if (frostStrength >= 1.0) focusGain = 1; // Refined
        else if (Math.random() < 0.5) focusGain = 1; // Common
        
        if (focusGain > 0) {
            newSession.focus = Math.min(newSession.maxFocus, newSession.focus + focusGain);
        }
    }

    // Talent: Deep Quench
    if (session.unlockedTalents.includes('t_dur_3')) {
        restoreAmount += 10;
        if (Math.random() < 0.2) {
             newSession.turnCount--; 
             newSession.logs = [`[深度淬火] 不消耗行动次数！`, ...session.logs];
        }
    }

    newSession.temperature = Math.max(0, session.temperature - heatRed);
    newSession.currentDurability = Math.min(newSession.maxDurability, session.currentDurability + restoreAmount);

    // Cat's Eye Rare Bonus (Restore 5 dur on miracle - applies to all, but Quench already restores. Let's add it anyway)
    if (isMiracle && miracleStrength >= 0.15) {
        newSession.currentDurability = Math.min(newSession.maxDurability, newSession.currentDurability + 5);
    }

    let logStr = `淬火：温度 -${heatRed}，耐久 +${restoreAmount}`;
    if (isMiracle) logStr += ' [奇迹:双倍? 无分不可双倍]'; // Miracle on Quench is mostly free cost (already 0) and Rare heal.
    
    newSession.logs = [logStr, ...newSession.logs]; 
  }

  // --- 4. LIGHT / HEAVY Logic ---
  else {
      const config = action === 'LIGHT' ? FORGE_ACTIONS.LIGHT : FORGE_ACTIONS.HEAVY;
      
      // Cost execution
      newSession.currentDurability -= actualCost;
      newSession.durabilitySpent += actualCost;

      const zone = getHeatZone(session.temperature);
      let zoneName = zone === 'LOW' ? '低温' : zone === 'OPTIMAL' ? '最佳' : '过热';
      let zoneScoreMult = zone === 'LOW' ? HEAT_CONFIG.LOW_SCORE_MULT : zone === 'OPTIMAL' ? HEAT_CONFIG.OPTIMAL_SCORE_MULT : HEAT_CONFIG.OVERHEAT_SCORE_MULT;
      
      // Talent: Perfect Temp Control
      if (zone === 'OPTIMAL' && session.unlockedTalents.includes('t_qual_4')) {
          zoneScoreMult = 1.8;
      }

      // Heat Change
      let heatAdd = config.heatAdd;
      
      // Mithril Wire (Light No Heat)
      if (action === 'LIGHT') {
          const mithrilStrength = getEffectStrength(session.materials, 'SPECIAL_LIGHT_NO_HEAT');
          if (mithrilStrength >= 1.0) heatAdd = 0; // Refined/Rare
          else if (mithrilStrength > 0) heatAdd = Math.floor(heatAdd / 2); // Common
      }

      newSession.temperature = Math.min(HEAT_CONFIG.MAX_TEMP, session.temperature + heatAdd);

      // Progress & Score Calculation
      const [minP, maxP] = config.progressRange;
      let progressGain = Math.floor(Math.random() * (maxP - minP + 1)) + minP;
      
      const [minS, maxS] = config.scoreRange;
      let baseScore = Math.floor(Math.random() * (maxS - minS + 1)) + minS;

      let logStatus = ` [${zoneName}]`;

      // -- Light Specific --
      if (action === 'LIGHT') {
          // Gale Feather Logic (Multihit)
          const featherStrength = getEffectStrength(session.materials, 'SPECIAL_LIGHT_MULTIHIT');
          let isMultihit = false;
          if (featherStrength > 0) {
              if (featherStrength >= 0.6 && session.comboActive) {
                  isMultihit = true; // Rare feather always hits twice on combo
              } else if (Math.random() < featherStrength) {
                  isMultihit = true;
              }
          }

          if (isMultihit) {
              baseScore *= 2;
              logStatus += ' [双重打击!]';
          }

          // Combo Check
          if (session.comboActive) {
              // Echo Crystal (Combo Regen)
              const echoStrength = getEffectStrength(session.materials, 'SPECIAL_COMBO_REGEN');
              if (echoStrength > 0) {
                  const heal = Math.floor(echoStrength); // 3, 5, 8
                  newSession.currentDurability = Math.min(newSession.maxDurability, newSession.currentDurability + heal);
                  
                  // Focus Gain
                  let addFocus = false;
                  if (echoStrength > 8) addFocus = true; // Rare
                  else if (echoStrength > 5 && Math.random() < 0.5) addFocus = true; // Refined
                  
                  if (addFocus) {
                       newSession.focus = Math.min(newSession.maxFocus, newSession.focus + 1);
                       logStatus += ' [回响:回气]';
                  }
                  logStatus += ` [回响:回血+${heal}]`;
              }
              
              // Double Focus Gain from Heavy Combo (Fixed from previous logic which only added 1)
              let focusGain = 2;
              if (isMultihit) focusGain += 1; // Feather multihit gives extra focus? Sure.
              
              newSession.focus = Math.min(newSession.maxFocus, newSession.focus + focusGain); 
              logStatus += ` [连击触发:专注+${focusGain}]`;
              newSession.comboActive = false; // Consume
              
              if (session.unlockedTalents.includes('t_qual_2')) {
                  baseScore *= 2;
                  logStatus += ' [余震暴击]';
              }
          } else {
              let focusGain = 1;
              if (isMultihit) focusGain += 1;
              newSession.focus = Math.min(newSession.maxFocus, newSession.focus + focusGain); 
              if(isMultihit) logStatus += ' [专注+2]';
          }
          
          if (session.unlockedTalents.includes('t_qual_1')) baseScore += 2;
      } 
      // -- Heavy Specific --
      else {
          const focus = session.focus;
          newSession.comboActive = true; // Enable Combo

          let focusMult = 1.0;
          let progressMult = 1.0;

          if (focus > 0) {
              focusMult = 1 + (focus * 0.5); 
              progressMult = 1 + (focus * 0.2); 
              logStatus += ` [专注x${focus}]`;
              newSession.focus = 0; 
              
              // Mind Crystal (Focus Buff - Rare Effect: Crit on Max Focus)
              // We need to check if we were at Max Focus. 
              // Note: maxFocus might vary per session, so we compare focus to session.maxFocus
              const mindStrength = getEffectStrength(session.materials, 'SPECIAL_FOCUS_BUFF');
              if (mindStrength > 2.0 && focus >= session.maxFocus) {
                   baseScore *= 2; // Auto Crit
                   logStatus += ' [全知暴击]';
              } else if (mindStrength > 1.0 && focus >= session.maxFocus) {
                   baseScore = Math.floor(baseScore * 1.2); // +20% dmg
              }

          } else {
              logStatus += ` [无专注]`;
          }
          
          baseScore = Math.floor(baseScore * focusMult);
          progressGain = Math.floor(progressGain * progressMult);
      }

      // --- Magma Core (Heat to Score) ---
      // Apply AFTER temp change? Or Before? Prompt says "Current Temp". Let's use resulting temp.
      const magmaStrength = getEffectStrength(session.materials, 'SPECIAL_HEAT_TO_SCORE');
      if (magmaStrength > 0) {
          let magmaBonus = Math.floor(newSession.temperature * magmaStrength);
          // Rare Bonus: Max Temp +50
          if (magmaStrength >= 2.0 && newSession.temperature >= 100) {
              magmaBonus += 50;
          }
          baseScore += magmaBonus;
          logStatus += ` [熔岩+${magmaBonus}]`;
      }

      let totalScore = Math.floor(baseScore * zoneScoreMult * session.scoreMultiplier * levelScale);
      
      // Talent: Flow State
      if (session.unlockedTalents.includes('t_qual_3')) {
          const chance = (action === 'HEAVY' ? session.focus : newSession.focus) * 0.02; // Use PRE-consumption focus for heavy
          if (Math.random() < chance) {
              totalScore = Math.floor(totalScore * 1.5);
              logStatus += ' [心流暴击]';
          }
      }

      // Miracle (Cat's Eye) - Double Score
      if (isMiracle) {
          totalScore *= 2;
          logStatus += ' [奇迹暴击!]';
          // Rare Cat's Eye Restore
          if (miracleStrength >= 0.15) {
              newSession.currentDurability = Math.min(newSession.maxDurability, newSession.currentDurability + 5);
          }
      }

      newSession.progress = Math.min(100, session.progress + progressGain);
      newSession.qualityScore += totalScore;

      if (newSession.progress >= 100 && session.progress < 100) {
          newSession.logs = [`进入打磨阶段！准备最后一搏...`, ...newSession.logs];
      } else {
          newSession.logs = [`${config.name}: 进度+${progressGain}%, 分+${totalScore} (耗${actualCost})${logStatus}`, ...session.logs];
      }
  }

  // --- 5. Post-Action Common Logic (Death Check & Blood Pact & Amber) ---

  // Blood Pact (Blood Stone) - Recalculate Score Multiplier based on missing durability
  const bloodStrength = getEffectStrength(session.materials, 'SPECIAL_BLOOD_PACT');
  if (bloodStrength > 0) {
      const missingDur = Math.max(0, newSession.maxDurability - newSession.currentDurability);
      const stacks = Math.floor(missingDur / 10);
      let pactBonus = stacks * bloodStrength * 0.01; // 0.2 -> 0.002 per stack? No, effectValue is 0.2 for 2%.
      
      // Rare Blood Stone: Double bonus if < 10% HP
      if (bloodStrength >= 0.5 && (newSession.currentDurability / newSession.maxDurability) < 0.1) {
          pactBonus *= 2;
      }
      
      // We need to Apply this dynamically. 
      // Current session.scoreMultiplier is base + static buffs.
      // We shouldn't permanently add to it every turn, or it grows exponentially.
      // We need to set it based on current state.
      // BUT `ForgeSession` state carries over.
      // Strategy: Calculate Base Multiplier again? 
      // Simplify: Just update the `scoreMultiplier` property to (Base + Dynamic).
      // Problem: We don't know Base easily here without recalcing everything.
      // Hack: Store `baseScoreMultiplier` in session? 
      // Let's just assume `scoreMultiplier` in session IS the current effective one. 
      // We reset it to base calculated from talents/materials (static) then add dynamic?
      // For now, let's just ADD the delta from *last turn*? No, drift.
      // Let's Recalculate Score Multiplier entirely.
      
      let baseMult = 1.0;
      // Re-check static material buffs
      session.materials.forEach(m => { if (m.effectType === 'SCORE_MULT') baseMult += m.effectValue; });
      if (session.unlockedTalents.includes('t_qual_5')) baseMult += 0.30;
      
      newSession.scoreMultiplier = baseMult + pactBonus;
  }

  // Death Check & Ancient Amber
  if (newSession.currentDurability <= 0) {
      const amberStrength = getEffectStrength(session.materials, 'SPECIAL_DEATH_SAVE');
      if (amberStrength > 0 && !session.deathSaveUsed) {
          // Trigger Save
          newSession.deathSaveUsed = true;
          
          let healAmount = 0;
          let resetTemp = false;
          
          // Determine Tier based on strength value
          if (amberStrength >= 100) { // Rare
              healAmount = Math.floor(newSession.maxDurability * 0.5);
              resetTemp = true;
              newSession.logs = [`[时光琥珀] 时间回溯！耐久恢复50%，温度重置！`, ...newSession.logs];
          } else if (amberStrength >= 30) { // Refined
              healAmount = 30;
              newSession.logs = [`[完整琥珀] 琥珀碎裂，抵挡了致命损伤！(+30耐久)`, ...newSession.logs];
          } else { // Common
              healAmount = 10;
              newSession.logs = [`[树脂化石] 勉强维持了形态... (+10耐久)`, ...newSession.logs];
          }
          
          newSession.currentDurability = healAmount;
          if (resetTemp) newSession.temperature = 0;
          
      } else {
          // Real Death
          // Obsidian Skin Rare: Immune to non-polish break?
          const obsidianStrength = getEffectStrength(session.materials, 'SPECIAL_HEAT_RESIST');
          if (obsidianStrength >= 1.0 && action !== 'POLISH') {
              newSession.currentDurability = 1; // Stay at 1
              newSession.logs = [`[永恒黑甲] 铠甲承受了冲击，强制保留 1 点耐久！`, ...newSession.logs];
          } else {
              newSession.currentDurability = 0;
              newSession.status = 'FAILURE';
              const heatZone = getHeatZone(newSession.temperature);
              let failMsg = `耐久耗尽！在${heatZone==='OVERHEAT'?'过热':heatZone==='LOW'?'低温':'最佳'}区操作导致崩坏...`;
              if (action === 'POLISH') failMsg = `打磨过度，前功尽弃...`;
              newSession.logs = [failMsg, ...newSession.logs];
          }
      }
  }

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
  
  const totalMaterialQuality = materials.reduce((sum, m) => sum + m.quality, 0);
  let resultQuality = Quality.Common;
  const roll = Math.random();

  if (totalMaterialQuality <= 4) {
      const threshold = qualityScore > 750 ? 0.2 : 0.1;
      resultQuality = roll < threshold ? Quality.Refined : Quality.Common;
  } else if (totalMaterialQuality <= 7) {
      if (qualityScore < 450) {
           resultQuality = roll < 0.5 ? Quality.Common : Quality.Refined;
      } else {
           if (roll < 0.2) resultQuality = Quality.Common;
           else if (roll < 0.9) resultQuality = Quality.Refined;
           else resultQuality = Quality.Rare;
      }
  } else {
      if (qualityScore < 650) {
           resultQuality = roll < 0.4 ? Quality.Refined : Quality.Rare;
      } else {
           resultQuality = roll < 0.1 ? Quality.Refined : Quality.Rare;
      }
  }

  let statCount = 2; 
  const scoreFactor = Math.min(1, qualityScore / 2500); 

  if (resultQuality === Quality.Refined) {
      if (Math.random() < (0.3 + scoreFactor * 0.5)) statCount = 3;
  } else if (resultQuality === Quality.Rare) {
      statCount = 3;
      if (Math.random() < (0.3 + scoreFactor * 0.5)) statCount = 4;
  }

  const weaponOrder: Stat['type'][] = ['ATK', 'CRIT', 'LIFESTEAL'];
  const armorOrder: Stat['type'][] = ['HP', 'DEF', 'LIFESTEAL'];
  const basePool = type === 'WEAPON' ? weaponOrder : armorOrder;

  let pool = [...basePool];
  if (resultQuality === Quality.Common) {
      pool = pool.filter(s => s !== 'LIFESTEAL');
  }

  const selectedStats: Stat[] = [];
  const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < statCount; i++) {
      const typeKey = shuffledPool[i % shuffledPool.length];
      const levelBase = 10 * Math.pow(1.3, playerLevel - 1);
      const qMult = resultQuality === Quality.Common ? 1.0 : resultQuality === Quality.Refined ? 1.3 : 1.6;
      const scoreBonus = Math.min(0.5, qualityScore / 2500); 
      
      const config = STAT_CONFIG[typeKey];
      const statRatio = config.base / 10;
      
      let finalVal = 0;

      if (typeKey === 'CRIT') {
          const baseCrit = resultQuality * 5; 
          finalVal = baseCrit + (qualityScore / 250);
          finalVal = Math.min(35, finalVal);
      } else if (typeKey === 'LIFESTEAL') {
          const baseLS = resultQuality === Quality.Rare ? 2 : 1;
          finalVal = baseLS + (qualityScore / 1500);
          finalVal = Math.min(5, finalVal);
      } else {
          finalVal = levelBase * statRatio * qMult * (1 + scoreBonus);
          finalVal *= (0.9 + Math.random() * 0.2);
      }

      selectedStats.push({
          type: typeKey,
          label: config.label,
          value: Math.floor(Math.max(1, finalVal)),
          suffix: config.suffix
      });
  }
  
  const sortOrder = ['HP', 'ATK', 'DEF', 'CRIT', 'LIFESTEAL'];
  selectedStats.sort((a, b) => sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type));

  const namePrefix = resultQuality === Quality.Rare ? '传说' : (resultQuality === Quality.Refined ? '精炼' : '普通的');
  const typeName = type === 'WEAPON' ? '神兵' : '护甲';
  const saleValue = Math.floor(qualityScore * 1.2) + (totalMaterialQuality * 50);

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
        description: '未知',
        isDungeonOnly: false
    }));

    const totalVal = materials.reduce((a, b) => a + (b as number), 0);
    const simulatedScore = totalVal * (isBossDrop ? 150 : 80) * (0.8 + Math.random() * 0.4);
    
    const mockSession: ForgeSession = {
        playerLevel,
        maxDurability: 100, currentDurability: 100, progress: 100, 
        qualityScore: Math.floor(simulatedScore), 
        costModifier: 0, scoreMultiplier: 1, 
        turnCount: 0, logs: [], status: 'SUCCESS',
        materials: fakeMaterials,
        activeDebuff: null,
        durabilitySpent: 0,
        temperature: 0, focus: 0, maxFocus: 3, polishCount: 0, 
        comboActive: false,
        deathSaveUsed: false,
        unlockedTalents: [],
        talents: {
             lightCostReduction: 0, heavyCostReductionPct: 0, heavyProgressBonusPct: 0,
             polishScoreBonusPct: 0, heavyFreeChance: 0, allCostReductionPct: 0
        }
    };
    return finalizeForge(mockSession, type, playerLevel);
};

export const generateBlacksmithReward = (targetScore: number, type: EquipmentType, playerLevel: number): Equipment => {
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
        description: '铁匠的馈赠',
        isDungeonOnly: false
    }));

    const variance = 0.9 + Math.random() * 0.2;
    const finalScore = Math.floor(targetScore * variance);

    const mockSession: ForgeSession = {
        playerLevel,
        maxDurability: 100, currentDurability: 100, progress: 100, 
        qualityScore: finalScore, 
        costModifier: 0, scoreMultiplier: 1, 
        turnCount: 0, logs: [], status: 'SUCCESS',
        materials: fakeMaterials,
        activeDebuff: null,
        durabilitySpent: 0,
        temperature: 0, focus: 0, maxFocus: 3, polishCount: 0,
        comboActive: false,
        deathSaveUsed: false,
        unlockedTalents: [],
        talents: {
             lightCostReduction: 0, heavyCostReductionPct: 0, heavyProgressBonusPct: 0,
             polishScoreBonusPct: 0, heavyFreeChance: 0, allCostReductionPct: 0
        }
    };

    return finalizeForge(mockSession, type, playerLevel);
};
