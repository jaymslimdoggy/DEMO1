
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Player, Material, Quality, Equipment, EquipmentType, ForgeSession, Blessing, BlessingTier, EventOption, DungeonState } from './types';
import { MATERIALS, INITIAL_GOLD, FORGE_ACTIONS, DUNGEON_CONFIG, BLESSINGS } from './constants';
import { generateEquipment, createForgeSession, executeForgeAction, finalizeForge, completeForgeSession, generateBlacksmithReward } from './services/gameLogic';
import { FloatingText, FloatingTextLayer } from './components/Shared/FloatingTextLayer';
import { ItemDetailModal } from './components/Shared/ItemDetailModal';
import { ForgeView } from './components/Views/ForgeView';
import { ShopView } from './components/Views/ShopView';
import { BagView } from './components/Views/BagView';
import { DungeonView } from './components/Views/DungeonView';
import { TalentView } from './components/Views/TalentView';

const App: React.FC = () => {
  const initialPlayerState: Player = {
    level: 1,
    exp: 0,
    maxExp: 150, 
    gold: INITIAL_GOLD,
    materials: [],
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    maxDungeonDepth: 0,
    unlockedFloors: [1], 
    unlockedTalents: [],
    baseStats: {
      HP: 100,
      ATK: 20,
      DEF: 10,
      CRIT: 5,
      LIFESTEAL: 0
    }
  };

  const [player, setPlayer] = useState<Player>(initialPlayerState);
  const [activeTab, setActiveTab] = useState<'FORGE' | 'SHOP' | 'BAG' | 'DUNGEON' | 'TALENTS'>('FORGE');
  
  // Forge State
  const [forgeSlots, setForgeSlots] = useState<(Material | null)[]>([null, null, null]);
  const [forgeType, setForgeType] = useState<EquipmentType>('WEAPON');
  const [forgeSession, setForgeSession] = useState<ForgeSession | null>(null);
  const [showResult, setShowResult] = useState<Equipment | null>(null); 
  const [inspectItem, setInspectItem] = useState<Equipment | null>(null); 
  
  // Dungeon & Prep State
  const [dungeon, setDungeon] = useState<DungeonState | null>(null); 
  const [selectedStartFloor, setSelectedStartFloor] = useState(1);
  const [prepSupplies, setPrepSupplies] = useState(0);
  const [prepBlessing, setPrepBlessing] = useState<Blessing | null>(null);
  const [isPrepMode, setIsPrepMode] = useState(false);
  const [pendingLoot, setPendingLoot] = useState<{item: Equipment | Material, type: 'EQUIPMENT' | 'MATERIAL'} | null>(null);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const floatingIdCounter = useRef(0);

  useEffect(() => {
    const savedData = localStorage.getItem('shingbing_forge_save_v4');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (!parsed.unlockedFloors) parsed.unlockedFloors = [1];
        if (!parsed.unlockedTalents) parsed.unlockedTalents = [];
        setPlayer({ ...initialPlayerState, ...parsed });
      } catch (e) {
        console.error("存档解析失败:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shingbing_forge_save_v4', JSON.stringify(player));
  }, [player]);

  const groupedMaterials = useMemo(() => {
    const groups: Record<string, { mat: Material, count: number, instances: Material[] }> = {};
    player.materials.forEach(m => {
        const key = `${m.name}_${m.quality}`;
        if (!groups[key]) {
            groups[key] = { mat: m, count: 0, instances: [] };
        }
        groups[key].count++;
        groups[key].instances.push(m);
    });
    return Object.values(groups).sort((a,b) => {
        if (a.mat.quality !== b.mat.quality) return a.mat.quality - b.mat.quality;
        return a.mat.price - b.mat.price;
    });
  }, [player.materials]);

  const totalStats = useMemo(() => {
    const stats = { ...player.baseStats };
    const applyItemStats = (item: Equipment | null) => {
      if (!item) return;
      const durabilityRatio = item.currentDurability / item.maxDurability;
      const multiplier = durabilityRatio <= 0 ? 0.5 : 1;
      item.stats.forEach((s: any) => {
        if (s.type in stats) {
          (stats as any)[s.type] += Math.floor(s.value * multiplier);
        }
      });
    };
    applyItemStats(player.equippedWeapon);
    applyItemStats(player.equippedArmor);
    if (dungeon && dungeon.starvationDebuff) {
        stats.ATK = Math.floor(stats.ATK * (1 - DUNGEON_CONFIG.STARVATION_ATK_LOSS_PCT));
    }
    return stats;
  }, [player, dungeon?.starvationDebuff]);

  const { weaponList, armorList } = useMemo(() => {
    const weapons = player.inventory.filter(i => i.type === 'WEAPON');
    const armors = player.inventory.filter(i => i.type === 'ARMOR');

    const sortFn = (a: Equipment, b: Equipment) => {
        const isEquippedA = player.equippedWeapon?.id === a.id || player.equippedArmor?.id === a.id;
        const isEquippedB = player.equippedWeapon?.id === b.id || player.equippedArmor?.id === b.id;
        if (isEquippedA && !isEquippedB) return -1;
        if (!isEquippedA && isEquippedB) return 1;
        if (b.quality !== a.quality) return b.quality - a.quality;
        return (b.score || 0) - (a.score || 0);
    };

    return {
        weaponList: weapons.sort(sortFn),
        armorList: armors.sort(sortFn)
    };
  }, [player.inventory, player.equippedWeapon, player.equippedArmor]);

  const forgePreview = useMemo(() => {
    let durability = 58 + (player.level * 2); 
    // Apply Talent Preview
    if (player.unlockedTalents.includes('t_dur_1')) durability += 10;
    if (player.unlockedTalents.includes('t_dur_4')) durability += 25;

    let costRed = 0;
    if (player.unlockedTalents.includes('t_dur_5')) costRed += 0.15;

    let scoreMult = 1.0;
    if (player.unlockedTalents.includes('t_qual_3')) scoreMult += 0.10;
    if (player.unlockedTalents.includes('t_qual_5')) scoreMult += 0.25;

    forgeSlots.forEach(s => {
      if (s) {
        if (s.effectType === 'DURABILITY') durability += s.effectValue;
        if (s.effectType === 'COST_REDUCTION') costRed += s.effectValue;
        if (s.effectType === 'SCORE_MULT') scoreMult += s.effectValue;
      }
    });
    return { durability, costRed, scoreMult };
  }, [forgeSlots, player.level, player.unlockedTalents]);

  // Supply Logic Memoization
  const supplyLogic = useMemo(() => {
      let maxSupplies = 20; // Base Cap
      let freeSupplies = 0;
      let supplyUnitCost = DUNGEON_CONFIG.SUPPLY_COST;

      // t_exp_2: Cap +2, Free +2
      if (player.unlockedTalents.includes('t_exp_2')) {
          maxSupplies += 2;
          freeSupplies += 2;
      }
      // t_exp_4: Cap +5, Cost -20%
      if (player.unlockedTalents.includes('t_exp_4')) {
          maxSupplies += 5;
          supplyUnitCost = Math.floor(supplyUnitCost * 0.8);
      }

      return { maxSupplies, freeSupplies, supplyUnitCost };
  }, [player.unlockedTalents]);

  const addFloatingText = (text: string, type: FloatingText['type'], x: number = 0, y: number = -20) => {
    const id = ++floatingIdCounter.current;
    const newText: FloatingText = { id, text, type, x, y };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000); 
  };

  const gainExp = (amount: number) => {
    setPlayer(prev => {
      let newExp = prev.exp + amount;
      let newLevel = prev.level;
      let newMaxExp = prev.maxExp;
      let newBaseStats = { ...prev.baseStats };

      while (newExp >= newMaxExp) {
        newExp -= newMaxExp;
        newLevel += 1;
        newMaxExp = Math.floor(newMaxExp * 1.8);
        newBaseStats.HP = Math.floor(newBaseStats.HP * 1.15);
        newBaseStats.ATK = Math.floor(newBaseStats.ATK * 1.15);
        newBaseStats.DEF = Math.floor(newBaseStats.DEF * 1.15);
        if (newBaseStats.CRIT < 20) newBaseStats.CRIT = Math.min(20, newBaseStats.CRIT + 2);
      }
      return { ...prev, level: newLevel, exp: newExp, maxExp: newMaxExp, baseStats: newBaseStats };
    });
  };

  const buyMaterial = (mat: Material) => {
    if (player.gold >= mat.price) {
      setPlayer(prev => ({
        ...prev,
        gold: prev.gold - mat.price,
        materials: [...prev.materials, { ...mat, id: Math.random().toString() }]
      }));
    } else {
      alert('金币不足！');
    }
  };

  const unlockTalent = (talentId: string, cost: number) => {
      setPlayer(prev => ({
          ...prev,
          gold: prev.gold - cost,
          unlockedTalents: [...prev.unlockedTalents, talentId]
      }));
      addFloatingText('习得技艺', 'score', 0, 0);
  };

  const debugGold = () => setPlayer(prev => ({ ...prev, gold: prev.gold + 1000 }));
  const debugExp = () => { gainExp(200); addFloatingText("+200 XP", 'exp', 60); };
  const resetGame = () => {
    if (window.confirm('确定要重置游戏进度吗？')) {
      setPlayer({ ...initialPlayerState, unlockedFloors: [1] });
      setForgeSlots([null, null, null]);
      setForgeSession(null);
      setDungeon(null);
    }
  };

  const repairAll = () => {
      const equipW = player.equippedWeapon;
      const equipA = player.equippedArmor;
      let totalCost = 0;
      if (equipW) totalCost += (equipW.maxDurability - equipW.currentDurability) * DUNGEON_CONFIG.REPAIR_COST_PER_POINT;
      if (equipA) totalCost += (equipA.maxDurability - equipA.currentDurability) * DUNGEON_CONFIG.REPAIR_COST_PER_POINT;
      
      if (totalCost === 0) return alert('装备完好，无需修理');
      if (player.gold < totalCost) return alert('金币不足以完全修复');

      setPlayer(prev => ({
          ...prev,
          gold: prev.gold - totalCost,
          equippedWeapon: prev.equippedWeapon ? { ...prev.equippedWeapon, currentDurability: prev.equippedWeapon.maxDurability } : null,
          equippedArmor: prev.equippedArmor ? { ...prev.equippedArmor, currentDurability: prev.equippedArmor.maxDurability } : null
      }));
      addFloatingText(`修复完成 -${totalCost}G`, 'heal');
  };
  
  const repairItem = (type: 'WEAPON' | 'ARMOR') => {
        const item = type === 'WEAPON' ? player.equippedWeapon : player.equippedArmor;
        if(!item) return;
        const cost = (item.maxDurability - item.currentDurability) * DUNGEON_CONFIG.REPAIR_COST_PER_POINT;
        if (cost <= 0) return;
        if (player.gold < cost) return alert('金币不足');
        setPlayer(p => ({
            ...p, 
            gold: p.gold - cost, 
            equippedWeapon: type === 'WEAPON' ? {...item, currentDurability: item.maxDurability} : p.equippedWeapon,
            equippedArmor: type === 'ARMOR' ? {...item, currentDurability: item.maxDurability} : p.equippedArmor
        }));
  }

  // --- FORGE LOGIC ---
  const addToForge = (mat: Material, index: number) => {
    const newSlots = [...forgeSlots];
    newSlots[index] = mat;
    setForgeSlots(newSlots);
    setPlayer(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== mat.id) }));
  };

  const removeFromForge = (index: number) => {
    const mat = forgeSlots[index];
    if (!mat) return;
    const newSlots = [...forgeSlots];
    newSlots[index] = null;
    setForgeSlots(newSlots);
    setPlayer(prev => ({ ...prev, materials: [...prev.materials, mat] }));
  };

  const startForgeSession = () => {
    const activeMaterials = forgeSlots.filter((s): s is Material => s !== null);
    if (activeMaterials.length === 0) return;
    const session = createForgeSession(activeMaterials, player.level, player.unlockedTalents);
    setForgeSession(session);
  };

  const handleFinishForge = () => {
    if (!forgeSession || forgeSession.status !== 'ACTIVE' || forgeSession.progress < 100) return;
    const finalSession = completeForgeSession(forgeSession);
    setForgeSession(finalSession);
    setTimeout(() => {
        const result = finalizeForge(finalSession, forgeType, player.level);
        setShowResult(result);
        setPlayer(prev => ({ ...prev, inventory: [...prev.inventory, result] }));
        setForgeSession(null);
        setForgeSlots([null, null, null]);
    }, 600);
  };

  const handleForgeAction = (action: 'LIGHT' | 'HEAVY' | 'QUENCH' | 'POLISH') => {
    if (!forgeSession || forgeSession.status !== 'ACTIVE') return;
    const prevScore = forgeSession.qualityScore;
    const prevDurability = forgeSession.currentDurability;
    const nextSession = executeForgeAction(forgeSession, action);
    setForgeSession(nextSession);
    const scoreDiff = nextSession.qualityScore - prevScore;
    const durabilityDiff = nextSession.currentDurability - prevDurability;
    const jitter = () => (Math.random() - 0.5) * 50; 
    const jitterY = () => (Math.random() - 0.5) * 20 - 20;
    if (scoreDiff > 0) addFloatingText(`品质 +${scoreDiff}`, 'score', jitter(), -60 + jitterY());
    if (scoreDiff < 0) addFloatingText(`品质 ${scoreDiff}`, 'damage', jitter(), -50 + jitterY());
    if (durabilityDiff > 0) addFloatingText(`耐久 +${durabilityDiff}`, 'heal', -60 + jitter(), -30 + jitterY());
    if (durabilityDiff < 0) addFloatingText(`耐久 ${durabilityDiff}`, 'durability_loss', -60 + jitter(), -30 + jitterY());
    if (nextSession.status === 'FAILURE') {
      setTimeout(() => { setForgeSession(null); setForgeSlots([null, null, null]); }, 1500); 
    }
  };

  const sellItem = (item: Equipment) => {
    if (player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id) return alert('无法出售已装备的物品！');
    setPlayer(prev => ({ ...prev, gold: prev.gold + item.value, inventory: prev.inventory.filter(i => i.id !== item.id) }));
  };

  const equipItem = (item: Equipment) => {
    setPlayer(prev => {
      if (item.type === 'WEAPON') return { ...prev, equippedWeapon: item };
      return { ...prev, equippedArmor: item };
    });
  };

  // --- DUNGEON PREP ---
  const openDungeonPrep = () => {
      setIsPrepMode(true);
      // Determine default value based on what feels right (Base 5 + Free 2 if applicable)
      // If we have free supplies, default selection should probably include them.
      let baseSelection = 5; 
      if (supplyLogic.freeSupplies > 0) {
          baseSelection += supplyLogic.freeSupplies;
      }
      setPrepSupplies(baseSelection); 
      setPrepBlessing(null);
  };

  const purchaseBlessing = (tier: BlessingTier) => {
      if (prepBlessing?.tier === tier) {
          setPrepBlessing(null);
          return;
      }
      const pool = BLESSINGS.filter(b => b.tier === tier);
      const randomBlessing = pool[Math.floor(Math.random() * pool.length)];
      setPrepBlessing(randomBlessing);
  };

  const launchDungeon = () => {
      const { freeSupplies, supplyUnitCost } = supplyLogic;

      // Calculate paid supplies: anything above the free amount
      const paidSupplies = Math.max(0, prepSupplies - freeSupplies);
      const supplyCost = paidSupplies * supplyUnitCost;

      const portalCost = selectedStartFloor === 1 ? 0 : selectedStartFloor * 10;
      const blessingCost = prepBlessing ? [0, 200, 800, 2000][prepBlessing.tier] : 0;
      const totalCost = supplyCost + portalCost + blessingCost;
      
      if (player.gold < totalCost) return alert('金币不足以支付入场费、补给和祝福');

      setPlayer(p => ({...p, gold: p.gold - totalCost}));
      
      let maxBag = DUNGEON_CONFIG.BASE_BAG_SIZE;
      if (prepBlessing?.type === 'BAG_EXPANSION') maxBag += prepBlessing.value;
      
      // Talent: Exploration - Bag Size
      if (player.unlockedTalents.includes('t_exp_1')) maxBag += 2;
      if (player.unlockedTalents.includes('t_exp_3')) maxBag += 3;
      if (player.unlockedTalents.includes('t_exp_5')) maxBag += 5;

      setDungeon({
        depth: selectedStartFloor - 1, 
        currentHP: totalStats.HP, maxHP: totalStats.HP,
        loot: { gold: 0, materials: [], inventory: [], exp: 0 },
        supplies: prepSupplies,
        maxBagCapacity: maxBag,
        blessing: prepBlessing,
        streak: 0,
        starvationDebuff: false,
        log: [`你步入了深渊遗迹 (第${selectedStartFloor}层)...`], 
        isDead: false, currentEvent: '远征开始', lastHealDepth: selectedStartFloor,
        lastEventResult: null 
      });
      setIsPrepMode(false);
      setTimeout(() => proceedDungeon(true), 100);
  };

  const addLog = (msg: string) => {
    setDungeon((prev: any) => prev ? ({ ...prev, log: [msg, ...prev.log].slice(0, 30) }) : null);
  };

  const setEventResult = (icon: string, title: string, desc: string, color: string) => {
      setDungeon((prev: any) => prev ? ({ ...prev, lastEventResult: { icon, title, desc, color }}) : null);
  };

  const setInteractiveEvent = (title: string, desc: string, options: EventOption[]) => {
      setDungeon(prev => prev ? ({ ...prev, activeChoice: { title, desc, options }, isProcessing: false }) : null);
  };

  // --- DUNGEON LOGIC ---

  const checkBagFull = () => {
      if (!dungeon) return true;
      const currentCount = dungeon.loot.materials.length + dungeon.loot.inventory.length;
      return currentCount >= dungeon.maxBagCapacity;
  };

  const handleLoot = (item: Equipment | Material, type: 'EQUIPMENT' | 'MATERIAL') => {
      if (!dungeon) return;
      if (checkBagFull()) {
          setPendingLoot({ item, type });
      } else {
          setDungeon(prev => {
              if (!prev) return null;
              const nextLoot = { ...prev.loot };
              if (type === 'EQUIPMENT') nextLoot.inventory = [...nextLoot.inventory, item as Equipment];
              else nextLoot.materials = [...nextLoot.materials, item as Material];
              return { ...prev, loot: nextLoot };
          });
      }
  };
  
  const handleSwapLoot = (indexToRemove: number) => {
      if (!dungeon || !pendingLoot) return;

      setDungeon(prev => {
          if (!prev) return null;
          
          const currentInvCount = prev.loot.inventory.length;
          const newLoot = { ...prev.loot };
          let removedItemName = '';

          // Remove item
          if (indexToRemove < currentInvCount) {
              removedItemName = newLoot.inventory[indexToRemove].name;
              newLoot.inventory = newLoot.inventory.filter((_, i) => i !== indexToRemove);
          } else {
              const matIndex = indexToRemove - currentInvCount;
              removedItemName = newLoot.materials[matIndex].name;
              newLoot.materials = newLoot.materials.filter((_, i) => i !== matIndex);
          }

          // Add new item
          if (pendingLoot.type === 'EQUIPMENT') {
              newLoot.inventory.push(pendingLoot.item as Equipment);
          } else {
              newLoot.materials.push(pendingLoot.item as Material);
          }

          return {
              ...prev,
              loot: newLoot,
              log: [`丢弃了 ${removedItemName}，保留了 ${pendingLoot.item.name}`, ...prev.log]
          };
      });
      setPendingLoot(null);
  };

  const proceedDungeon = (isFirst: boolean = false) => {
    if (!isFirst) {
        if (!dungeon || dungeon.isDead || dungeon.isProcessing || (dungeon.battle && !dungeon.battle.isFinished) || dungeon.activeChoice) return;
        setDungeon((prev: any) => prev ? ({ ...prev, isProcessing: true, lastEventResult: null }) : null);
    }
    
    setTimeout(() => {
      setDungeon((prev) => {
          if (!prev) return null;
          const baseState = { ...prev, battle: undefined, activeChoice: undefined };
          const nextDepth = prev.depth + 1;
          const isBossStage = nextDepth % 10 === 0;
          const depthBoost = nextDepth;
          
          setPlayer(prevPlayer => ({ ...prevPlayer, maxDungeonDepth: Math.max(prevPlayer.maxDungeonDepth, nextDepth) }));

          // --- SUPPLY CONSUMPTION ---
          let nextSupplies = prev.supplies;
          let suppliesConsumed = 1;
          
          if (prev.blessing?.type === 'SUPPLY_SAVE') {
              if (nextDepth % prev.blessing.value === 0) suppliesConsumed = 0;
          }

          nextSupplies = Math.max(0, nextSupplies - suppliesConsumed);
          
          let nextHP = prev.currentHP;
          let nextStarvation = prev.starvationDebuff;
          
          if (prev.supplies === 0 && suppliesConsumed > 0) {
              const dmg = Math.floor(prev.maxHP * DUNGEON_CONFIG.STARVATION_HP_LOSS_PCT);
              nextHP = Math.max(0, nextHP - dmg);
              if (!prev.starvationDebuff) nextStarvation = true;
              addLog(`[饥饿] 补给耗尽！生命 -${dmg}，攻击力大幅下降！`);
          } else if (suppliesConsumed > 0) {
              addLog(`消耗1份补给，剩余 ${nextSupplies}。`);
          }

          if (nextHP <= 0) {
              addLog(`你饿死在了第${nextDepth}层...`);
              return { ...baseState, isDead: true, currentHP: 0 };
          }

          const nextStreak = prev.streak + 1;

          if (nextDepth > 1 && nextDepth % 30 === 1) {
              if (!player.unlockedFloors.includes(nextDepth)) {
                   return {
                      ...baseState,
                      depth: nextDepth, 
                      currentHP: nextHP, 
                      supplies: nextSupplies, 
                      streak: nextStreak, 
                      starvationDebuff: nextStarvation,
                      currentEvent: '发现传送门',
                      isProcessing: false,
                      activeChoice: {
                          title: '休眠的传送阵',
                          desc: `在第 ${nextDepth} 层，你发现了一个古老的传送阵。激活它，以后可以直接传送至此。`,
                          options: [
                              {
                                  label: '激活传送阵',
                                  style: 'text-blue-400 border-blue-500/50 bg-blue-900/20',
                                  action: () => {
                                      setPlayer(p => ({...p, unlockedFloors: [...p.unlockedFloors, nextDepth].sort((a,b)=>a-b)}));
                                      setDungeon(d => d ? {...d, activeChoice: undefined, log: [`[记录] 传送节点已激活：第${nextDepth}层`, ...d.log]} : null);
                                  }
                              },
                              {
                                  label: '忽略',
                                  style: 'text-zinc-500',
                                  action: () => setDungeon(d => d ? {...d, activeChoice: undefined, log: ['你没有激活传送阵。', ...d.log]} : null)
                              }
                          ]
                      }
                  };
              }
          }

          if (isBossStage) {
            const monsterMaxHP = 150 + depthBoost * 35;
            addLog(`[警告] 第${nextDepth}关，首领房间！`);
            setEventResult('fa-dragon', 'BOSS 降临', `第 ${nextDepth} 层`, 'text-red-600');
            return {
              ...baseState, depth: nextDepth, currentHP: nextHP, supplies: nextSupplies, streak: nextStreak, starvationDebuff: nextStarvation,
              currentEvent: '首领房间', isProcessing: false,
              battle: { monsterName: `【首领】毁灭领主 等级.${depthBoost}`, monsterMaxHP, monsterHP: monsterMaxHP, monsterATK: 15 + Math.floor(depthBoost * 5), isFinished: false, victory: false }
            };
          }

          const eventRoll = Math.random();
          
          if (eventRoll > 0.85) {
              const subRoll = Math.random();
              if (subRoll < 0.33) {
                  setInteractiveEvent('废弃营地', '一处尚有余温的篝火，看起来还算安全。', [
                      { label: '休息 (恢复20%生命)', action: () => { setDungeon(d => d ? {...d, currentHP: Math.min(d.maxHP, d.currentHP + Math.floor(d.maxHP*0.2)), activeChoice: undefined, log: ['休息了一会儿，精神焕发。', ...d.log]} : null); }},
                      { label: '搜寻 (30%得物品/70%无)', action: () => {
                           if (Math.random() < 0.3) {
                               const gold = 50 + nextDepth * 5;
                               setDungeon(d => d ? {...d, loot: {...d.loot, gold: d.loot.gold + gold}, activeChoice: undefined, log: [`在帐篷里发现了 ${gold} 金币！`, ...d.log]} : null);
                           } else {
                               setDungeon(d => d ? {...d, activeChoice: undefined, log: ['什么都没找到...', ...d.log]} : null);
                           }
                      }}
                  ]);
                  return { ...baseState, depth: nextDepth, currentHP: nextHP, supplies: nextSupplies, streak: nextStreak, starvationDebuff: nextStarvation, currentEvent: '废弃营地' };
              } else if (subRoll < 0.66) {
                  setInteractiveEvent('翻倒的马车', '商队的残骸散落一地。', [
                       { label: '寻找补给 (+2干粮)', action: () => { setDungeon(d => d ? {...d, supplies: d.supplies + 2, activeChoice: undefined, log: ['找到了几包未开封的干粮。', ...d.log]} : null); }},
                       { label: '寻找货物 (随机材料)', action: () => {
                            const mat = MATERIALS[Math.floor(Math.random() * 9)];
                            handleLoot({...mat, id: Math.random().toString()}, 'MATERIAL');
                            setDungeon(d => d ? {...d, activeChoice: undefined, log: [`发现了一块 ${mat.name}。`, ...d.log]} : null);
                       }}
                  ]);
                  return { ...baseState, depth: nextDepth, currentHP: nextHP, supplies: nextSupplies, streak: nextStreak, starvationDebuff: nextStarvation, currentEvent: '商队残骸' };
              } else {
                  setInteractiveEvent('流浪铁匠', '“给我1份补给，我能帮你做点什么。”', [
                      { 
                          label: '修复装备 (消耗1补给)', 
                          action: () => {
                              if (!dungeon) return;
                              if (dungeon.supplies < 1) {
                                  addLog('补给不足，铁匠摇了摇头。');
                                  return;
                              }
                              setDungeon(d => d ? {...d, supplies: d.supplies - 1, activeChoice: undefined, log: ['消耗1份补给。铁匠帮你敲打了一番装备，焕然一新。', ...d.log]} : null);
                              setPlayer(p => ({
                                   ...p,
                                   equippedWeapon: p.equippedWeapon ? {...p.equippedWeapon, currentDurability: p.equippedWeapon.maxDurability} : null,
                                   equippedArmor: p.equippedArmor ? {...p.equippedArmor, currentDurability: p.equippedArmor.maxDurability} : null,
                              }));
                          }
                      },
                      { 
                          label: '交换装备 (消耗1补给)',
                          action: () => {
                              if (!dungeon) return;
                              if (dungeon.supplies < 1) {
                                  addLog('补给不足，铁匠摇了摇头。');
                                  return;
                              }
                              const wScore = player.equippedWeapon?.score || 0;
                              const aScore = player.equippedArmor?.score || 0;
                              let count = 0;
                              if (player.equippedWeapon) count++;
                              if (player.equippedArmor) count++;
                              const avg = count > 0 ? Math.floor((wScore + aScore) / count) : (50 * player.level);
                              const newType: EquipmentType = Math.random() > 0.5 ? 'WEAPON' : 'ARMOR';
                              const newItem = generateBlacksmithReward(avg, newType, player.level);
                              handleLoot(newItem, 'EQUIPMENT');
                              setDungeon(d => d ? {...d, supplies: d.supplies - 1, activeChoice: undefined, log: [`消耗1份补给。铁匠扔给你一件 ${newItem.name}。`, ...d.log]} : null);
                          }
                      },
                      { label: '离开', action: () => setDungeon(d => d ? {...d, activeChoice: undefined} : null) }
                  ]);
                  return { ...baseState, depth: nextDepth, currentHP: nextHP, supplies: nextSupplies, streak: nextStreak, starvationDebuff: nextStarvation, currentEvent: '流浪铁匠' };
              }
          }

          else if (eventRoll < 0.40) { 
            const monsterMaxHP = 40 + depthBoost * 20;
            addLog(`遭遇：${depthBoost}级怪物拦住了去路！`);
            setEventResult('fa-spider', '遭遇战', `${depthBoost}级 遗迹守卫`, 'text-orange-500');
            return {
              ...baseState, depth: nextDepth, currentHP: nextHP, supplies: nextSupplies, streak: nextStreak, starvationDebuff: nextStarvation,
              currentEvent: '遭遇怪物', isProcessing: false,
              battle: { monsterName: `遗迹守卫 等级.${depthBoost}`, monsterMaxHP, monsterHP: monsterMaxHP, monsterATK: 8 + Math.floor(depthBoost * 3.5), isFinished: false, victory: false }
            };
          } 
          
          else {
            const streakBonus = 1 + (nextStreak * DUNGEON_CONFIG.STREAK_BONUS_PCT);
            const foundGold = Math.floor(Math.random() * 20 * depthBoost * streakBonus);
            const foundExp = Math.floor((12 + Math.random() * 6) * (1 + Math.floor(nextDepth / 10) * 0.5));
            
            const typeRoll = Math.random();
            let finalIndex = 0;
            const specialChance = 0.15 + Math.min(0.15, nextDepth / 200) + (streakBonus * 0.05);

            if (Math.random() < specialChance) {
                finalIndex = 9 + Math.floor(Math.random() * 10);
            } else {
                let typeOffset = 0; 
                if (typeRoll > 0.7) typeOffset = 6; 
                else if (typeRoll > 0.4) typeOffset = 3; 
                const qualityRoll = Math.random() * streakBonus; // Streak improves quality
                let qOffset = 0;
                if (qualityRoll > 1.2) qOffset = 2; 
                else if (qualityRoll > 0.8) qOffset = 1; 
                finalIndex = Math.min(8, typeOffset + qOffset);
            }

            const newMat = { ...MATERIALS[finalIndex], id: Math.random().toString() };
            gainExp(foundExp);
            handleLoot(newMat, 'MATERIAL');
            addLog(`搜刮：获得了 ${foundGold} 金币，${newMat.name} 和 ${foundExp} 经验。`);
            const msgColor = newMat.isDungeonOnly ? 'text-purple-400' : 'text-yellow-500';
            const icon = newMat.isDungeonOnly ? 'fa-gem' : 'fa-box-open';
            setEventResult(icon, '搜刮成功', `获得 ${newMat.name}`, msgColor);
            
            return {
              ...baseState, depth: nextDepth, currentHP: nextHP, supplies: nextSupplies, streak: nextStreak, starvationDebuff: nextStarvation,
              currentEvent: '搜刮废墟', isProcessing: false,
              loot: { ...baseState.loot, gold: baseState.loot.gold + foundGold }
            };
          }
      });
    }, isFirst ? 0 : 400);
  };

  const startBattle = async () => {
     if (!dungeon || !dungeon.battle || dungeon.battle.isFinished) return;
    
    setDungeon((prev: any) => prev ? ({ ...prev, battle: { ...prev.battle, isStarted: true } }) : null);

    let mHP = dungeon.battle.monsterHP;
    let pHP = dungeon.currentHP;
    const mATK = dungeon.battle.monsterATK;
    const pATK = totalStats.ATK;
    const pCRIT = totalStats.CRIT;
    const pDEF = totalStats.DEF;
    const pLIFESTEAL = totalStats.LIFESTEAL;

    const degradeEquipment = (isPlayerAttacking: boolean) => {
        setPlayer(prev => {
            let w = prev.equippedWeapon;
            let a = prev.equippedArmor;
            let changed = false;

            if (isPlayerAttacking && w && w.currentDurability > 0) {
                 const saveChance = dungeon.blessing?.type === 'DURABILITY_SAVE' ? dungeon.blessing.value : 0;
                 if (Math.random() >= saveChance) {
                     w = { ...w, currentDurability: Math.max(0, w.currentDurability - DUNGEON_CONFIG.DURABILITY_LOSS_PER_HIT) };
                     changed = true;
                     if (w.currentDurability === 0) addFloatingText('武器损坏!', 'durability_loss', -100, -20);
                 }
            }
            if (!isPlayerAttacking && a && a.currentDurability > 0) {
                 const saveChance = dungeon.blessing?.type === 'DURABILITY_SAVE' ? dungeon.blessing.value : 0;
                 if (Math.random() >= saveChance) {
                     a = { ...a, currentDurability: Math.max(0, a.currentDurability - DUNGEON_CONFIG.DURABILITY_LOSS_PER_HIT) };
                     changed = true;
                     if (a.currentDurability === 0) addFloatingText('防具损坏!', 'durability_loss', -100, -20);
                 }
            }
            return changed ? { ...prev, equippedWeapon: w, equippedArmor: a } : prev;
        });
    };

    while (mHP > 0 && pHP > 0) {
      // Player Turn
      const isCrit = Math.random() * 100 < pCRIT;
      const rawDmg = Math.floor(pATK * (isCrit ? 1.5 : 1));
      const minDmg = Math.ceil(pATK * 0.05);
      const finalDmg = Math.max(minDmg, rawDmg); 
      const heal = Math.floor(finalDmg * (pLIFESTEAL / 100));
      mHP = Math.max(0, mHP - finalDmg);
      pHP = Math.min(dungeon.maxHP, pHP + heal);
      degradeEquipment(true); 

      const jitter = (Math.random() - 0.5) * 40;
      // Player attacks (Damage on Monster - Right Side +120)
      addFloatingText(`-${finalDmg}${isCrit ? '!' : ''}`, 'damage', 120 + jitter, -20);
      // Player heals (Heal on Player - Left Side -120)
      if (heal > 0) addFloatingText(`+${heal}`, 'heal', -120 + jitter, -30);
      
      setDungeon((prev: any) => prev ? ({ ...prev, currentHP: pHP, battle: { ...prev.battle, monsterHP: mHP } }) : null);
      if (mHP <= 0) break;
      await new Promise(r => setTimeout(r, 600));

      // Monster Turn
      if (mHP > 0) {
        const rawMDmg = mATK - pDEF;
        const minMDmg = Math.ceil(mATK * 0.05);
        const finalMDmg = Math.max(minMDmg, rawMDmg);
        pHP = Math.max(0, pHP - finalMDmg);
        degradeEquipment(false); 
        
        // Monster attacks (Damage on Player - Left Side -120)
        addFloatingText(`-${finalMDmg}`, 'player_damage', -120 + jitter, -20);
        setDungeon((prev: any) => prev ? ({ ...prev, currentHP: pHP }) : null);
        if (pHP <= 0) break;
        await new Promise(r => setTimeout(r, 600));
      }
    }

    const victory = mHP <= 0;
    if (victory) {
      // Talent: Exploration - Gold Bonus (t_exp_5)
      let goldMult = 1;
      if (player.unlockedTalents.includes('t_exp_5')) goldMult = 1.2;

      if (dungeon.blessing?.type === 'LOW_HP_RECOVERY') {
          const hpRatio = pHP / dungeon.maxHP;
          if (hpRatio < 0.3) {
              const healAmt = Math.floor(dungeon.maxHP * dungeon.blessing.value);
              pHP = Math.min(dungeon.maxHP, pHP + healAmt);
              setDungeon((prev: any) => prev ? ({...prev, currentHP: pHP}) : null);
              addLog(`[祝福] 绝境逢生！回复了 ${healAmt} 点生命。`);
          }
      }

      const isBoss = dungeon.depth % 10 === 0;
      const battleExp = isBoss ? 150 : 40;
      gainExp(battleExp);
      addFloatingText(`+${battleExp} XP`, 'exp', 0, -50);

      let newMat = null;
      let newItem = null;
      if (isBoss) {
          if (Math.random() < 0.6) {
             const specialIdx = 9 + Math.floor(Math.random() * 10);
             newMat = { ...MATERIALS[specialIdx], id: Math.random().toString() };
          } else {
             newMat = { ...MATERIALS[8], id: Math.random().toString() }; 
          }
          newItem = generateEquipment('WEAPON', [Quality.Rare, Quality.Rare, Quality.Rare], player.level);
      } else if (Math.random() > 0.5) {
          const typeRoll = Math.random();
          let typeOffset = 0; 
          if (typeRoll > 0.6) typeOffset = 3; 
          const finalIndex = typeOffset + (Math.random() > 0.8 ? 1 : 0);
          newMat = { ...MATERIALS[finalIndex], id: Math.random().toString() };
      }
      
      if (newItem) handleLoot(newItem, 'EQUIPMENT');
      if (newMat) handleLoot(newMat, 'MATERIAL');

      setDungeon((prev: any) => {
        if (!prev) return null;
        return { ...prev, isDead: false, battle: { ...prev.battle, isFinished: true, victory: true } };
      });
      addLog(`战斗胜利！获得 ${battleExp} 经验。`);
      setEventResult('fa-trophy', '战斗胜利', `获得 ${battleExp} 经验`, 'text-yellow-400');
    } else {
      setDungeon((prev: any) => prev ? ({ ...prev, isDead: true, battle: { ...prev.battle, isFinished: true, victory: false } }) : null);
      addLog(`战斗失败...`);
    }
  };

  const withdraw = () => { 
      if (!dungeon) return; 
      
      // Talent: Gold Bonus (t_exp_5)
      let finalGold = dungeon.loot.gold;
      if (player.unlockedTalents.includes('t_exp_5')) {
          finalGold = Math.floor(finalGold * 1.2);
      }

      setPlayer(prev => ({ ...prev, gold: prev.gold + finalGold, materials: [...prev.materials, ...dungeon.loot.materials], inventory: [...prev.inventory, ...dungeon.loot.inventory] })); 
      setDungeon(null); 
      setActiveTab('BAG'); 
  };
  const handleDeath = () => { setPlayer(prev => ({ ...prev, equippedWeapon: null, equippedArmor: null, inventory: prev.inventory.filter(item => item.id !== prev.equippedWeapon?.id && item.id !== prev.equippedArmor?.id) })); setDungeon(null); setActiveTab('FORGE'); };
  
  const handlePrevFloor = () => {
      const currentFloorIndex = player.unlockedFloors.indexOf(selectedStartFloor);
      if (currentFloorIndex > 0) setSelectedStartFloor(player.unlockedFloors[currentFloorIndex - 1]);
  };
  const handleNextFloor = () => {
      const currentFloorIndex = player.unlockedFloors.indexOf(selectedStartFloor);
      if (currentFloorIndex < player.unlockedFloors.length - 1) setSelectedStartFloor(player.unlockedFloors[currentFloorIndex + 1]);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto flex flex-col p-4 md:p-6 relative overflow-hidden h-screen text-zinc-200">
      
      {/* FloatingTextLayer removed from here, now passed to views */}

      {showResult && <ItemDetailModal item={showResult} onClose={() => setShowResult(null)} isForgeResult={true} />}
      {inspectItem && <ItemDetailModal item={inspectItem} onClose={() => setInspectItem(null)} onAction={() => equipItem(inspectItem)} actionLabel={player.equippedWeapon?.id === inspectItem.id || player.equippedArmor?.id === inspectItem.id ? '使用中' : '装备'} />}
      
      {/* LOOT FULL MODAL */}
      {pendingLoot && dungeon && (
          <div className="fixed inset-0 bg-black/95 z-[150] flex flex-col items-center justify-center p-6 animate-fadeIn">
              <h2 className="text-3xl font-black text-red-500 mb-2 tracking-widest uppercase">背包已满</h2>
              <div className="text-zinc-400 mb-6 text-center">点击背包中的物品进行交换，<br/>或直接丢弃新获得的物品。</div>
              <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-6 w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-16 h-16 rounded-xl bg-black/40 flex items-center justify-center text-3xl border-2 border-zinc-700 quality-${pendingLoot.item.quality}`}>
                            <i className={`fas ${pendingLoot.type === 'EQUIPMENT' ? 'fa-khanda' : 'fa-cube'}`}></i>
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-green-500 font-bold uppercase mb-1">新物品</div>
                            <div className={`text-xl font-black truncate quality-${pendingLoot.item.quality}`}>{pendingLoot.item.name}</div>
                        </div>
                      </div>
                      <button onClick={() => setPendingLoot(null)} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg font-bold text-sm whitespace-nowrap transition">
                          丢弃此物品
                      </button>
                  </div>
                  <div className="text-sm font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2"><i className="fas fa-box-open"></i> 当前背包 ({dungeon.maxBagCapacity})</div>
                  <div className="flex-1 overflow-y-auto pr-1">
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {[...dungeon.loot.inventory, ...dungeon.loot.materials].map((item, idx) => {
                              const isEquip = 'stats' in item;
                              return (
                                  <button key={idx} onClick={() => handleSwapLoot(idx)} className={`aspect-square bg-zinc-800 rounded-xl border-2 border-zinc-700 hover:border-white hover:bg-zinc-700 transition flex flex-col items-center justify-center p-1 relative group quality-${item.quality}`}>
                                      <div className={`text-2xl mb-1 quality-${item.quality}`}>
                                          <i className={`fas ${isEquip ? (item.type === 'WEAPON' ? 'fa-khanda' : 'fa-shield-alt') : (item.isDungeonOnly ? 'fa-gem' : 'fa-cube')}`}></i>
                                      </div>
                                      <div className="text-[10px] font-bold text-center w-full truncate px-1 opacity-80">{item.name}</div>
                                      <div className="absolute inset-0 bg-red-500/80 text-white font-black text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity backdrop-blur-sm">
                                          替换
                                      </div>
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {!dungeon && activeTab !== 'BAG' && activeTab !== 'TALENTS' && (
        <header className="flex justify-between items-center mb-4 bg-zinc-800/80 backdrop-blur p-4 rounded-xl border border-zinc-700 shadow-lg shrink-0 z-10">
            <div>
            <h1 className="text-3xl font-black text-yellow-500 tracking-widest uppercase">锻造大师 <span className="text-lg text-zinc-300 align-top ml-1">v4.2</span></h1>
            <div className="text-base font-mono text-zinc-200 mt-1">LV.{player.level} | EXP {player.exp}/{player.maxExp}</div>
            </div>
            <div className="text-right">
            <div className="flex items-center text-yellow-400 text-3xl font-bold justify-end"><i className="fas fa-coins mr-2 text-xl"></i>{player.gold}</div>
            <div className="flex gap-2 mt-2">
                <button onClick={debugGold} className="text-sm bg-zinc-700 px-4 py-1.5 rounded text-zinc-200 font-bold">G+</button>
                <button onClick={debugExp} className="text-sm bg-zinc-700 px-4 py-1.5 rounded text-zinc-200 font-bold">XP+</button>
                <button onClick={resetGame} className="text-sm bg-red-900/50 text-red-300 px-4 py-1.5 rounded font-bold">Reset</button>
            </div>
            </div>
        </header>
      )}

      <main className={`flex-1 overflow-hidden flex flex-col min-h-0 relative ${!dungeon ? 'pb-24' : ''}`}>
        
        {/* Render FloatingTextLayer for global tabs if needed, but Forge/Dungeon have their own */}
        {activeTab !== 'FORGE' && activeTab !== 'DUNGEON' && (
             <FloatingTextLayer texts={floatingTexts} />
        )}

        {activeTab === 'FORGE' && (
          <ForgeView 
             player={player}
             forgeSession={forgeSession}
             forgeSlots={forgeSlots}
             forgeType={forgeType}
             forgePreview={forgePreview}
             groupedMaterials={groupedMaterials}
             floatingTexts={floatingTexts}
             onSetForgeType={setForgeType}
             onAddSlot={addToForge}
             onRemoveSlot={removeFromForge}
             onStartForge={startForgeSession}
             onForgeAction={handleForgeAction}
             onFinishForge={handleFinishForge}
          />
        )}

        {activeTab === 'SHOP' && (
           <ShopView 
              player={player}
              onBuyMaterial={buyMaterial}
              onSellItem={sellItem}
           />
        )}

        {activeTab === 'BAG' && (
           <BagView 
              player={player}
              totalStats={totalStats}
              weaponList={weaponList}
              armorList={armorList}
              onInspectItem={setInspectItem}
              onEquipItem={equipItem}
           />
        )}

        {activeTab === 'TALENTS' && (
            <TalentView 
                player={player}
                onUnlockTalent={unlockTalent}
            />
        )}

        {activeTab === 'DUNGEON' && (
            <DungeonView
              player={player}
              dungeon={dungeon}
              isPrepMode={isPrepMode}
              prepSupplies={prepSupplies}
              prepBlessing={prepBlessing}
              selectedStartFloor={selectedStartFloor}
              floatingTexts={floatingTexts}
              supplyLogic={supplyLogic} // Pass the calculated supply logic (max, free, cost)
              onOpenPrep={openDungeonPrep}
              onClosePrep={() => setIsPrepMode(false)}
              onSetPrepSupplies={setPrepSupplies}
              onPurchaseBlessing={purchaseBlessing}
              onPrevFloor={handlePrevFloor}
              onNextFloor={handleNextFloor}
              onLaunchDungeon={launchDungeon}
              onRepairItem={repairItem}
              onRepairAll={repairAll}
              onProceedDungeon={proceedDungeon}
              onWithdraw={withdraw}
              onStartBattle={startBattle}
              onHandleDeath={handleDeath}
            />
        )}

      </main>

      {!dungeon && (
        <footer className="mt-4 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl shadow-xl shrink-0 z-10 grid grid-cols-5 gap-2">
            {[
                { id: 'FORGE', icon: 'fa-hammer', label: '锻造' },
                { id: 'SHOP', icon: 'fa-store', label: '商店' },
                { id: 'BAG', icon: 'fa-box', label: '背包' },
                { id: 'TALENTS', icon: 'fa-drafting-compass', label: '匠艺' },
                { id: 'DUNGEON', icon: 'fa-dungeon', label: '远征' }
            ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 relative overflow-hidden group ${isActive ? 'bg-amber-600 text-white shadow-lg scale-105' : 'bg-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                    >
                        {isActive && <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700 opacity-100 -z-10"></div>}
                        <i className={`fas ${tab.icon} text-xl mb-1 ${isActive ? 'animate-pulse' : ''}`}></i>
                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                )
            })}
        </footer>
      )}
    </div>
  );
};

export default App;
