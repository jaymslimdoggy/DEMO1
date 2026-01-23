import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Player, Material, Quality, Equipment, EquipmentType, ForgeSession, Blessing, BlessingTier, BlessingType, EventOption, DungeonState } from './types';
import { MATERIALS, INITIAL_GOLD, FORGE_ACTIONS, DUNGEON_CONFIG, BLESSINGS } from './constants';
import { generateEquipment, createForgeSession, executeForgeAction, finalizeForge, completeForgeSession, generateBlacksmithReward } from './services/gameLogic';

interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'exp' | 'score' | 'durability_loss' | 'player_damage';
  x: number;
  y: number;
}

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
    baseStats: {
      HP: 100,
      ATK: 20,
      DEF: 10,
      CRIT: 5,
      LIFESTEAL: 0
    }
  };

  const [player, setPlayer] = useState<Player>(initialPlayerState);
  const [activeTab, setActiveTab] = useState<'FORGE' | 'SHOP' | 'BAG' | 'DUNGEON'>('FORGE');
  
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
  const [bagFilter, setBagFilter] = useState<'ALL' | 'WEAPON' | 'ARMOR'>('ALL');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const dungeonLogRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('shingbing_forge_save_v3');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (!parsed.unlockedFloors) parsed.unlockedFloors = [1];
        setPlayer({ ...initialPlayerState, ...parsed });
      } catch (e) {
        console.error("存档解析失败:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shingbing_forge_save_v3', JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    if (activeTab === 'BAG') {
      setBagFilter('ALL');
    }
  }, [activeTab]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [forgeSession?.logs]);

  useEffect(() => {
    if (dungeonLogRef.current) {
        dungeonLogRef.current.scrollTop = 0; 
    }
  }, [dungeon?.log]);

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
      
      // Durability Penalty
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
    
    // Starvation Debuff
    if (dungeon && dungeon.starvationDebuff) {
        stats.ATK = Math.floor(stats.ATK * (1 - DUNGEON_CONFIG.STARVATION_ATK_LOSS_PCT));
    }

    return stats;
  }, [player, dungeon?.starvationDebuff]);

  // BAG SORTING LOGIC: Separated into Weapons and Armor, Equipped first
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
    let costRed = 0;
    let scoreMult = 1.0;
    forgeSlots.forEach(s => {
      if (s) {
        if (s.effectType === 'DURABILITY') durability += s.effectValue;
        if (s.effectType === 'COST_REDUCTION') costRed += s.effectValue;
        if (s.effectType === 'SCORE_MULT') scoreMult += s.effectValue;
      }
    });
    return { durability, costRed, scoreMult };
  }, [forgeSlots, player.level]);

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

  // --- ACTIONS ---

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
    const session = createForgeSession(activeMaterials, player.level);
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
      setPrepSupplies(5); // Default recommendation
      setPrepBlessing(null);
  };

  const purchaseBlessing = (tier: BlessingTier) => {
      // Toggle logic
      if (prepBlessing?.tier === tier) {
          setPrepBlessing(null);
          return;
      }
      const pool = BLESSINGS.filter(b => b.tier === tier);
      const randomBlessing = pool[Math.floor(Math.random() * pool.length)];
      setPrepBlessing(randomBlessing);
  };

  const launchDungeon = () => {
      const supplyCost = prepSupplies * DUNGEON_CONFIG.SUPPLY_COST;
      const portalCost = selectedStartFloor === 1 ? 0 : selectedStartFloor * 10;
      const blessingCost = prepBlessing ? [0, 200, 800, 2000][prepBlessing.tier] : 0;
      const totalCost = supplyCost + portalCost + blessingCost;
      
      if (player.gold < totalCost) return alert('金币不足以支付入场费、补给和祝福');

      setPlayer(p => ({...p, gold: p.gold - totalCost}));
      
      let maxBag = DUNGEON_CONFIG.BASE_BAG_SIZE;
      if (prepBlessing?.type === 'BAG_EXPANSION') maxBag += prepBlessing.value;

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
          
          // Blessing: Supply Save
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

          // Increase Streak
          const nextStreak = prev.streak + 1;

          // --- 1. Portal Check (Updated) ---
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

          // --- 2. Boss Stage ---
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
          
          // --- 3. Interactive Events ---
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

          // --- 4. Monster Encounter ---
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
          
          // --- 5. Loot ---
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
                     if (w.currentDurability === 0) addFloatingText('武器损坏!', 'durability_loss');
                 }
            }
            if (!isPlayerAttacking && a && a.currentDurability > 0) {
                 const saveChance = dungeon.blessing?.type === 'DURABILITY_SAVE' ? dungeon.blessing.value : 0;
                 if (Math.random() >= saveChance) {
                     a = { ...a, currentDurability: Math.max(0, a.currentDurability - DUNGEON_CONFIG.DURABILITY_LOSS_PER_HIT) };
                     changed = true;
                     if (a.currentDurability === 0) addFloatingText('防具损坏!', 'durability_loss');
                 }
            }
            return changed ? { ...prev, equippedWeapon: w, equippedArmor: a } : prev;
        });
    };

    while (mHP > 0 && pHP > 0) {
      // Player Turn
      const isCrit = Math.random() * 100 < pCRIT;
      
      // NEW COMBAT LOGIC: Min damage 5% of ATK
      const rawDmg = Math.floor(pATK * (isCrit ? 1.5 : 1));
      const minDmg = Math.ceil(pATK * 0.05);
      const finalDmg = Math.max(minDmg, rawDmg - 0 /* Monster has no DEF logic yet, usually 0 */); 
      // Note: currently monster DEF is ignored or 0. If monsters get DEF, add here.
      
      const heal = Math.floor(finalDmg * (pLIFESTEAL / 100));
      mHP = Math.max(0, mHP - finalDmg);
      pHP = Math.min(dungeon.maxHP, pHP + heal);
      
      degradeEquipment(true); // Weapon loss

      const jitter = (Math.random() - 0.5) * 40;
      addFloatingText(`-${finalDmg}${isCrit ? '!' : ''}`, 'damage', 60 + jitter, -20);
      if (heal > 0) addFloatingText(`+${heal}`, 'heal', -60 + jitter, -30);
      
      setDungeon((prev: any) => prev ? ({ ...prev, currentHP: pHP, battle: { ...prev.battle, monsterHP: mHP } }) : null);
      if (mHP <= 0) break;
      await new Promise(r => setTimeout(r, 600));

      // Monster Turn
      if (mHP > 0) {
        // NEW COMBAT LOGIC: Min damage 5% of ATK
        const rawMDmg = mATK - pDEF;
        const minMDmg = Math.ceil(mATK * 0.05);
        const finalMDmg = Math.max(minMDmg, rawMDmg);

        pHP = Math.max(0, pHP - finalMDmg);
        
        degradeEquipment(false); // Armor loss

        addFloatingText(`-${finalMDmg}`, 'player_damage', -60 + jitter, -20);
        setDungeon((prev: any) => prev ? ({ ...prev, currentHP: pHP }) : null);
        if (pHP <= 0) break;
        await new Promise(r => setTimeout(r, 600));
      }
    }

    const victory = mHP <= 0;
    if (victory) {
      // Recovery Blessing Logic (Keep existing)
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

  const withdraw = () => { if (!dungeon) return; setPlayer(prev => ({ ...prev, gold: prev.gold + dungeon.loot.gold, materials: [...prev.materials, ...dungeon.loot.materials], inventory: [...prev.inventory, ...dungeon.loot.inventory] })); setDungeon(null); setActiveTab('BAG'); };
  const handleDeath = () => { setPlayer(prev => ({ ...prev, equippedWeapon: null, equippedArmor: null, inventory: prev.inventory.filter(item => item.id !== prev.equippedWeapon?.id && item.id !== prev.equippedArmor?.id) })); setDungeon(null); setActiveTab('FORGE'); };
  
  const isTempering = forgeSession && forgeSession.progress >= 100;
  const BAG_FILTER_NAMES: {[key: string]: string} = { 'ALL': '全部', 'WEAPON': '武器', 'ARMOR': '防具' };

  const getSlotStatus = (index: number) => {
      const unlockLevel = [1, 2, 4][index];
      const isLocked = player.level < unlockLevel;
      return { isLocked, unlockLevel };
  };

  const getMaterialUnlockLevel = (quality: Quality) => {
    if (quality === Quality.Common) return 1;
    if (quality === Quality.Refined) return 2;
    if (quality === Quality.Rare) return 3;
    return 1;
  };

  // UI helpers (renderItemCard, renderItemDetailModal) same as before...
  const renderItemCard = (item: Equipment, onClick: () => void, isEquipped: boolean) => {
      const durabilityRatio = item.currentDurability / item.maxDurability;
      return (
        <div key={item.id} onClick={onClick} className={`bg-zinc-900 border rounded-xl p-3 flex flex-col relative group cursor-pointer hover:border-zinc-500 transition active:scale-95 shadow-sm ${isEquipped ? 'border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.3)] bg-green-950/20' : 'border-zinc-800'}`}>
            {isEquipped && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-green-400 text-[10px] font-black bg-green-950 px-2 py-0.5 rounded-full border border-green-800 shadow z-10">当前装备</div>}
            <div className="flex items-center gap-3 mb-2"><div className={`w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-xl border border-zinc-800/50 quality-${item.quality}`}><i className={`fas ${item.type === 'WEAPON' ? 'fa-khanda' : 'fa-shield-alt'}`}></i></div><div className="min-w-0"><div className={`font-bold text-sm quality-${item.quality} truncate`}>{item.name}</div><div className="text-[10px] text-zinc-500 font-bold uppercase">{item.type === 'WEAPON' ? '武器' : '防具'}</div></div></div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full border border-zinc-700 overflow-hidden mb-2">
                <div className={`h-full ${durabilityRatio < 0.3 ? 'bg-red-500' : 'bg-blue-400'}`} style={{width: `${durabilityRatio * 100}%`}}></div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 mb-2 space-y-0.5 border border-zinc-800/30 flex-1">{item.stats.slice(0, 3).map((s:any, i:number) => <div key={i} className="flex justify-between text-xs"><span className="text-zinc-500">{s.label}</span><span className="text-zinc-300">+{s.value}{s.suffix}</span></div>)}</div>
            <button onClick={(e) => { e.stopPropagation(); equipItem(item); }} disabled={isEquipped} className={`w-full py-2 rounded-lg font-bold text-xs border transition-colors ${isEquipped ? 'bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed' : 'bg-green-700 hover:bg-green-600 text-white border-green-600 shadow-md'}`}>{isEquipped ? '使用中' : '装备'}</button>
        </div>
      );
  };

  const renderItemDetailModal = (item: Equipment, onClose: () => void, isForgeResult: boolean = false) => {
    const durabilityRatio = item.currentDurability / item.maxDurability;
    return (
    <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-800 border-2 border-zinc-600 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_60px_rgba(0,0,0,0.5)] text-center relative overflow-hidden flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className={`absolute top-0 left-0 w-full h-2 opacity-50 bg-gradient-to-r from-transparent via-${item.quality === Quality.Rare ? 'yellow-500' : item.quality === Quality.Refined ? 'green-500' : 'zinc-500'} to-transparent`}></div>
        <h2 className="text-2xl font-black mb-1 text-white italic tracking-widest uppercase drop-shadow-md shrink-0">{isForgeResult ? '神兵降世' : '装备详情'}</h2>
        
        <div className="shrink-0 mb-4">
            <div className={`text-4xl font-black mb-3 quality-${item.quality} drop-shadow-lg`}>{item.name}</div>
            <div className="flex justify-center gap-2 mb-2">
                <span className={`text-sm px-4 py-1 rounded border font-bold ${item.type === 'WEAPON' ? 'text-red-400 border-red-900/50 bg-red-950/30' : 'text-blue-400 border-blue-900/50 bg-blue-950/30'}`}>{item.type === 'WEAPON' ? '武器' : '防具'}</span>
                <div className="inline-block bg-zinc-900/80 px-4 py-1 rounded-full border border-zinc-700">
                    <span className="text-zinc-300 text-sm font-bold mr-2">评分</span>
                    <span className="text-yellow-400 font-mono text-xl font-black">{item.score || '???'}</span>
                </div>
            </div>
            {/* Durability Bar */}
            <div className="w-full bg-zinc-900 h-2 rounded-full border border-zinc-700 overflow-hidden">
                <div className={`h-full ${durabilityRatio < 0.3 ? 'bg-red-500' : 'bg-blue-400'}`} style={{width: `${durabilityRatio * 100}%`}}></div>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{item.currentDurability} / {item.maxDurability} 耐久</div>
        </div>

        <div className="bg-zinc-900/80 rounded-2xl p-6 border border-zinc-700/80 shadow-inner flex-1 overflow-y-auto max-h-[40vh]">
            <div className="space-y-3">
            {item.stats.map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                <span className="text-zinc-300 font-bold text-xl uppercase">{s.label}</span>
                <span className="text-3xl font-black text-white">+{s.value}{s.suffix}</span>
                </div>
            ))}
            </div>
        </div>
        
        {isForgeResult ? 
            <button onClick={onClose} className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-black rounded-2xl transition shadow-lg tracking-widest uppercase transform active:scale-95 text-lg shrink-0 mt-auto">收下</button> :
            <button onClick={onClose} className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-black rounded-2xl transition shadow-lg tracking-widest uppercase transform active:scale-95 text-lg shrink-0 mt-auto">关闭</button>
        }
      </div>
    </div>
  )};

  const currentFloorIndex = player.unlockedFloors.indexOf(selectedStartFloor);
  const handlePrevFloor = () => {
      if (currentFloorIndex > 0) setSelectedStartFloor(player.unlockedFloors[currentFloorIndex - 1]);
  };
  const handleNextFloor = () => {
      if (currentFloorIndex < player.unlockedFloors.length - 1) setSelectedStartFloor(player.unlockedFloors[currentFloorIndex + 1]);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto flex flex-col p-4 md:p-6 relative overflow-hidden h-screen text-zinc-200">
      
      <div className="absolute inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
        {floatingTexts.map(ft => (
          <div 
             key={ft.id} 
             className={`absolute font-black text-3xl animate-floatUp pointer-events-none text-stroke whitespace-nowrap ${
               ft.type === 'damage' ? 'text-yellow-400 text-4xl' : 
               ft.type === 'player_damage' ? 'text-red-600 text-4xl' :
               ft.type === 'durability_loss' ? 'text-red-500 scale-125' : 
               ft.type === 'heal' ? 'text-green-500' : 
               ft.type === 'score' ? 'text-yellow-400 text-4xl drop-shadow-[0_0_10px_gold]' :
               'text-blue-400'
             }`}
             style={{ 
               transform: `translate(${ft.x}px, ${ft.y}px)`, 
               '--tw-translate-x': `${ft.x}px`,
               '--tw-translate-y': `${ft.y}px`,
             } as React.CSSProperties}
          >
             {ft.text}
          </div>
        ))}
      </div>

      {showResult && renderItemDetailModal(showResult, () => setShowResult(null), true)}
      {inspectItem && renderItemDetailModal(inspectItem, () => setInspectItem(null), false)}
      
      {/* LOOT FULL MODAL */}
      {pendingLoot && dungeon && (
          <div className="fixed inset-0 bg-black/95 z-[150] flex flex-col items-center justify-center p-6 animate-fadeIn">
              <h2 className="text-3xl font-black text-red-500 mb-2 tracking-widest uppercase">背包已满</h2>
              <div className="text-zinc-400 mb-6 text-center">点击背包中的物品进行交换，<br/>或直接丢弃新获得的物品。</div>
              
              <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-6 w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh]">
                  {/* New Item Section */}
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

                  {/* Current Inventory Grid */}
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

      {/* Conditional Header */}
      {!dungeon && activeTab !== 'BAG' && (
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
        
        {activeTab === 'FORGE' && (
          <div className="h-full flex flex-col gap-4 animate-fadeIn">
            {/* Forge logic identical */}
            {forgeSession ? (
                 <div className={`flex-1 bg-zinc-900 rounded-2xl border p-2 flex flex-col relative overflow-hidden transition-colors duration-700 ${forgeSession.status === 'FAILURE' ? 'border-red-600' : isTempering ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-zinc-700'}`}>
                {forgeSession.status === 'FAILURE' && (
                  <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center animate-fadeIn">
                     <i className="fas fa-heart-broken text-9xl text-red-600 mb-6 animate-bounce"></i>
                     <div className="text-5xl font-black text-red-500 uppercase tracking-widest">锻造失败</div>
                     <div className="text-zinc-200 mt-4 text-2xl">材料已损毁</div>
                  </div>
                )}
                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] opacity-50 transition-all duration-1000 ${isTempering ? 'from-purple-900/40 via-zinc-900/80 to-zinc-950' : 'from-orange-900/20 via-zinc-900/50 to-zinc-950'}`}></div>
                <div className="shrink-0 p-4 bg-zinc-800/80 rounded-xl border border-zinc-700/50 backdrop-blur-sm z-10 flex justify-between items-center mb-4">
                  <div className="flex flex-col w-full text-center">
                     <span className="text-lg text-zinc-200 uppercase font-black tracking-widest mb-1">{isTempering ? '打磨阶段' : '品质评分'}</span>
                     <span className={`text-7xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all ${isTempering ? 'text-purple-400 scale-110' : 'text-zinc-100'}`}>{forgeSession.qualityScore}</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center px-4 gap-8 z-10 relative">
                   {forgeSession.activeDebuff && (
                       <div className="absolute top-[-30px] left-0 right-0 flex justify-center animate-bounce">
                           <div className={`px-4 py-2 rounded-full font-black text-lg border-2 shadow-lg flex items-center gap-2 ${forgeSession.activeDebuff === 'HARDENED' ? 'bg-red-950/90 border-red-500 text-red-400' : 'bg-zinc-800/90 border-zinc-500 text-zinc-300'}`}>
                               <i className={`fas ${forgeSession.activeDebuff === 'HARDENED' ? 'fa-exclamation-triangle' : 'fa-cloud-meatball'}`}></i>
                               <span>{forgeSession.activeDebuff === 'HARDENED' ? '硬化状态：下次消耗翻倍' : '钝化状态：下次收益减半'}</span>
                           </div>
                       </div>
                   )}
                   
                   {/* NEW: MOMENTUM INDICATOR */}
                   {!isTempering && forgeSession.momentum > 0 && (
                       <div className="absolute top-0 right-0 animate-bounce-in">
                           <div className="bg-orange-900/90 border border-orange-500 text-orange-200 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                               <i className="fas fa-meteor text-orange-400 text-xl animate-pulse"></i>
                               <div>
                                   <div className="text-sm font-black uppercase tracking-wider">重势 x{forgeSession.momentum}</div>
                                   <div className="text-[10px] font-bold opacity-80">打磨分 +{forgeSession.momentum * 15}%</div>
                               </div>
                           </div>
                       </div>
                   )}

                   <div>
                      <div className="flex justify-between text-lg font-bold mb-2 uppercase tracking-wider text-green-400">
                        <span>完成度 {isTempering && <span className="text-purple-400 ml-2 animate-pulse">已成型，可打磨！</span>}</span>
                        <span>{forgeSession.progress}%</span>
                      </div>
                      <div className={`h-12 bg-zinc-950 rounded-full overflow-hidden border relative shadow-inner transition-colors ${isTempering ? 'border-purple-500' : 'border-zinc-700'}`}>
                         <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)] opacity-20"></div>
                         <div className={`h-full transition-all duration-300 relative flex items-center justify-end px-3 ${isTempering ? 'bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'bg-gradient-to-r from-green-800 to-green-500'}`} style={{ width: `${Math.min(100, forgeSession.progress)}%` }}>
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_10px_white]"></div>
                         </div>
                      </div>
                   </div>
                   <div>
                      <div className="flex justify-between text-lg font-bold mb-2 uppercase tracking-wider text-red-400">
                        <span>耐久度 {isTempering && <span className="text-red-500 ml-2 animate-pulse">耗尽即损毁!</span>}</span>
                        <span>{forgeSession.currentDurability} / {forgeSession.maxDurability}</span>
                      </div>
                      <div className="h-10 bg-zinc-950 rounded-full overflow-hidden border border-zinc-700 shadow-inner">
                         <div className={`h-full transition-all duration-300 ${forgeSession.currentDurability < 10 ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-red-800 to-red-600'}`} style={{ width: `${Math.max(0, (forgeSession.currentDurability / forgeSession.maxDurability) * 100)}%` }}></div>
                      </div>
                   </div>
                </div>
                <div className="shrink-0 p-4 z-10 min-h-[160px] flex items-end">
                   {!isTempering ? (
                     <div className="grid grid-cols-3 gap-3 w-full">
                        <button onClick={() => handleForgeAction('LIGHT')} disabled={forgeSession.status !== 'ACTIVE'} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-2xl p-2 flex flex-col items-center justify-center active:scale-95 transition group h-36 relative shadow-lg">
                           <div className="flex items-center justify-center gap-2 mb-2 w-full"><i className="fas fa-hammer text-blue-400 text-2xl group-hover:-rotate-12 transition-transform"></i><span className="font-black text-xl text-white whitespace-nowrap">轻击</span></div>
                           <div className="text-center w-full flex flex-col justify-center gap-1"><div className="text-sm font-bold text-zinc-300 leading-tight">消耗 {Math.max(1, Math.floor(FORGE_ACTIONS.LIGHT.baseCost * (1 - forgeSession.costModifier)))} 耐久</div><div className="text-xs text-zinc-500 scale-90 origin-center whitespace-nowrap">稳定提升进度</div></div>
                        </button>
                        <button onClick={() => handleForgeAction('HEAVY')} disabled={forgeSession.status !== 'ACTIVE'} className="bg-zinc-800 hover:bg-zinc-700 border border-orange-900/50 rounded-2xl p-2 flex flex-col items-center justify-center active:scale-95 transition group relative overflow-hidden h-36 shadow-lg">
                           <div className="absolute inset-0 bg-orange-900/10 group-hover:bg-orange-900/20 transition-colors"></div>
                           <div className="flex items-center justify-center gap-2 mb-2 z-10 w-full"><i className="fas fa-gavel text-orange-500 text-2xl group-hover:scale-110 transition-transform"></i><span className="font-black text-xl text-orange-100 whitespace-nowrap">重锤</span></div>
                           <div className="text-center z-10 w-full flex flex-col justify-center gap-1"><div className="text-sm font-bold text-orange-300 leading-tight">消耗 {Math.max(1, Math.floor(FORGE_ACTIONS.HEAVY.baseCost * (1 - forgeSession.costModifier)))} 耐久</div><div className="text-xs text-orange-400/80 scale-90 origin-center whitespace-nowrap">大幅增分 + 积攒重势</div></div>
                        </button>
                        <button onClick={() => handleForgeAction('QUENCH')} disabled={forgeSession.status !== 'ACTIVE' || forgeSession.quenchCooldown > 0} className={`bg-zinc-800 border border-zinc-600 rounded-2xl p-2 flex flex-col items-center justify-center transition relative h-36 shadow-lg ${forgeSession.quenchCooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700 active:scale-95'}`}>
                           {forgeSession.quenchCooldown > 0 && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl font-black text-3xl text-white z-20">{forgeSession.quenchCooldown}</div>}
                           <div className="flex items-center justify-center gap-2 mb-2 w-full"><i className="fas fa-fire text-cyan-400 text-2xl animate-pulse"></i><span className="font-black text-xl text-white whitespace-nowrap">淬火</span></div>
                           <div className="text-center w-full flex flex-col justify-center gap-1"><div className="text-sm font-bold text-green-400 leading-tight">恢复30%耐久</div><div className="text-xs text-zinc-500 scale-90 origin-center whitespace-nowrap text-red-400/80">可能伴随负面效果</div></div>
                        </button>
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-6 w-full">
                        <button onClick={handleFinishForge} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-800 to-green-600 hover:from-green-700 hover:to-green-500 rounded-2xl border-2 border-green-400 shadow-lg active:scale-95 transition h-40">
                           <div className="text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-3"><i className="fas fa-check-circle"></i>完成</div>
                           <div className="text-base text-green-100 font-bold">保留当前品质</div>
                        </button>
                        <button onClick={() => handleForgeAction('POLISH')} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-900 to-purple-700 hover:from-purple-800 hover:to-purple-600 rounded-2xl border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition relative overflow-hidden group h-40">
                           <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.1),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                           <div className="text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-3"><i className="fas fa-gem animate-pulse"></i>打磨</div>
                           <div className="text-sm text-purple-200 font-bold">消耗重势爆发</div>
                           <div className="text-xs text-purple-300 mt-1">{forgeSession.polishCount === 0 ? '当前效率 100%' : forgeSession.polishCount === 1 ? '效率降至 80% (消耗1.5x)' : '效率降至 50% (消耗2x)'}</div>
                        </button>
                     </div>
                   )}
                </div>
                <div className="h-28 bg-black/40 p-4 overflow-y-auto text-base font-mono space-y-1.5 border-t border-zinc-800 z-10 shrink-0">
                  {forgeSession.logs.map((log, i) => <div key={i} className={`opacity-90 ${i === 0 ? 'text-white font-bold' : 'text-zinc-400'}`}>{i === 0 ? '> ' : ''}{log}</div>)}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            ) : (
              <div className="flex-col flex h-full gap-4">
                 <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 flex flex-col items-center relative overflow-hidden shrink-0 shadow-lg">
                  <h2 className="text-3xl mb-6 font-black flex items-center justify-center text-zinc-200 uppercase tracking-widest"><i className="fas fa-fire-alt mr-2 text-orange-500"></i> 锻造台</h2>
                  <div className="flex gap-6 mb-8 bg-zinc-900/50 p-2 rounded-xl">
                    <button onClick={() => setForgeType('WEAPON')} className={`px-10 py-4 rounded-lg text-xl font-bold transition ${forgeType === 'WEAPON' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>武器</button>
                    <button onClick={() => setForgeType('ARMOR')} className={`px-10 py-4 rounded-lg text-xl font-bold transition ${forgeType === 'ARMOR' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>防具</button>
                  </div>
                  <div className="flex justify-center items-center gap-6 mb-8 w-full px-4">
                    {forgeSlots.map((slot, i) => {
                      const { isLocked, unlockLevel } = getSlotStatus(i);
                      return (
                        <div key={i} onClick={() => !isLocked && removeFromForge(i)} className={`w-32 h-40 rounded-2xl border-2 flex flex-col items-center justify-center transition relative group ${isLocked ? 'border-zinc-800 bg-zinc-900 cursor-not-allowed opacity-60' : slot ? 'border-zinc-500 bg-zinc-800 cursor-pointer border-dashed' : 'border-zinc-700 border-dashed hover:border-zinc-500 cursor-pointer'}`}>
                          {isLocked ? <><i className="fas fa-lock text-4xl text-zinc-700 mb-2"></i><div className="text-xs text-zinc-600 font-bold uppercase">LV.{unlockLevel} 解锁</div></> : slot ? <><div className={`text-6xl mb-4 quality-${slot.quality}`}><i className="fas fa-cube"></i></div><div className={`text-base font-bold text-center px-1 leading-tight quality-${slot.quality}`}>{slot.name}</div><div className="absolute -bottom-5 bg-zinc-950 text-sm px-3 py-1.5 rounded-lg border border-zinc-700 whitespace-nowrap z-10 shadow-lg font-bold flex items-center gap-1.5">{slot.effectType === 'DURABILITY' && <span className="text-zinc-400 flex items-center gap-1"><i className="fas fa-shield-alt"></i><span>耐久 +{slot.effectValue}</span></span>}{slot.effectType === 'COST_REDUCTION' && <span className="text-blue-400 flex items-center gap-1"><i className="fas fa-feather"></i><span>消耗 -{Math.round(slot.effectValue*100)}%</span></span>}{slot.effectType === 'SCORE_MULT' && <span className="text-yellow-400 flex items-center gap-1"><i className="fas fa-star"></i><span>品质 +{Math.round(slot.effectValue*100)}%</span></span>}{slot.effectType.startsWith('SPECIAL') && <span className="text-purple-400 flex items-center gap-1"><i className="fas fa-gem animate-pulse"></i><span>特殊效果</span></span>}</div></> : <i className="fas fa-plus text-zinc-700 text-4xl group-hover:text-zinc-500"></i>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="w-full bg-zinc-900/50 rounded-xl p-6 border border-zinc-700/50 mb-6 grid grid-cols-3 gap-6 text-center">
                     <div><div className="text-base text-zinc-300 font-bold uppercase mb-2 flex items-center justify-center gap-1.5"><i className="fas fa-shield-alt text-zinc-400"></i>初始耐久</div><div className="text-white font-mono font-black text-3xl">{forgePreview.durability}</div></div>
                     <div><div className="text-base text-zinc-300 font-bold uppercase mb-2 flex items-center justify-center gap-1.5"><i className="fas fa-feather text-blue-400"></i>耐久消耗</div><div className="text-blue-400 font-mono font-black text-3xl">-{Math.round(forgePreview.costRed*100)}%</div></div>
                     <div><div className="text-base text-zinc-300 font-bold uppercase mb-2 flex items-center justify-center gap-1.5"><i className="fas fa-star text-yellow-500"></i>品质倍率</div><div className="text-yellow-500 font-mono font-black text-3xl">x{forgePreview.scoreMult.toFixed(2)}</div></div>
                  </div>
                  <button disabled={forgeSlots.filter(s => s !== null).length === 0} onClick={startForgeSession} className={`w-full py-6 text-white font-black text-3xl rounded-2xl shadow-xl active:scale-95 transition tracking-widest bg-gradient-to-r from-orange-700 to-red-700 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:grayscale`}>开始锻造</button>
                </div>
                 <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 flex-1 min-h-0 flex flex-col">
                  <h3 className="text-lg font-black text-zinc-300 mb-4 uppercase tracking-widest flex items-center shrink-0"><i className="fas fa-cubes mr-2"></i> 材料仓库</h3>
                  <div className="grid grid-cols-3 gap-3 overflow-y-auto scrollbar-thin content-start p-1">
                    {groupedMaterials.length === 0 && <div className="col-span-3 text-zinc-400 text-lg py-12 italic text-center">空空如也...去商店买点吧</div>}
                    {groupedMaterials.map(({ mat, count, instances }) => (
                      <button key={`${mat.name}_${mat.quality}`} onClick={() => { const emptyIndex = forgeSlots.findIndex((s, i) => s === null && !getSlotStatus(i).isLocked); if (emptyIndex !== -1 && instances.length > 0) addToForge(instances[0], emptyIndex); }} className={`p-4 rounded-xl border bg-zinc-900 flex flex-col items-center justify-center min-h-[160px] hover:bg-zinc-800 transition active:scale-95 relative group shadow-md ${mat.quality === Quality.Rare ? 'border-yellow-900/50' : mat.quality === Quality.Refined ? 'border-green-900/50' : 'border-zinc-700'}`}>
                         <div className="absolute top-2 right-2 bg-zinc-800 text-sm font-mono font-black px-2 py-0.5 rounded text-white border border-zinc-600 z-10 shadow">x{count}</div>
                         <div className={`text-5xl mb-3 quality-${mat.quality}`}><i className="fas fa-cube"></i></div>
                         <div className={`text-xl font-black quality-${mat.quality} truncate w-full text-center leading-tight mb-3`}>{mat.name}</div>
                         <div className="text-sm text-zinc-200 font-bold bg-zinc-950/80 px-2 py-2 rounded-xl w-full border border-zinc-700/30 min-h-[3.5rem] flex items-center justify-center mt-auto">
                            <div className="text-center leading-snug">
                               {mat.effectType === 'DURABILITY' && <i className="fas fa-shield-alt text-zinc-400 mr-1.5"></i>}
                               {mat.effectType === 'COST_REDUCTION' && <i className="fas fa-feather text-blue-400 mr-1.5"></i>}
                               {mat.effectType === 'SCORE_MULT' && <i className="fas fa-star text-yellow-500 mr-1.5"></i>}
                               {mat.effectType.startsWith('SPECIAL') && <i className="fas fa-gem text-purple-400 mr-1.5"></i>}
                               <span>{mat.effectType === 'COST_REDUCTION' ? `耐久消耗 -${Math.round(mat.effectValue*100)}%` : mat.description}</span>
                            </div>
                         </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'SHOP' && (
             <div className="space-y-4 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
             <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h2 className="text-3xl mb-6 font-black flex items-center text-zinc-200"><i className="fas fa-shopping-cart mr-3 text-green-500"></i> 原料采购</h2>
              <div className="grid grid-cols-3 gap-4">
                {MATERIALS.filter(m => !m.isDungeonOnly).map(mat => {
                    const unlockLevel = getMaterialUnlockLevel(mat.quality);
                    const isLocked = player.level < unlockLevel;
                    return (
                      <div key={mat.id} className={`bg-zinc-900 p-4 rounded-xl border flex flex-col items-center text-center shadow-lg relative overflow-hidden group ${isLocked ? 'border-zinc-800 opacity-70 grayscale' : 'border-zinc-800'}`}>
                        <div className={`absolute top-0 left-0 w-1.5 quality-${mat.quality} bg-current opacity-80`}></div>
                        <div className="flex flex-col items-center mb-3 w-full">
                            <div className={`w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center text-4xl quality-${mat.quality} mb-3 border border-zinc-800/50`}>{isLocked ? <i className="fas fa-lock text-zinc-600"></i> : <i className="fas fa-cube"></i>}</div>
                            <div className={`font-black text-lg quality-${mat.quality} truncate w-full`}>{mat.name}</div>
                            <div className="text-sm text-zinc-300 font-bold mt-2 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-zinc-700/50 flex items-center justify-center gap-1.5">{mat.effectType === 'DURABILITY' && <i className="fas fa-shield-alt text-zinc-400"></i>}{mat.effectType === 'COST_REDUCTION' && <i className="fas fa-feather text-blue-400"></i>}{mat.effectType === 'SCORE_MULT' && <i className="fas fa-star text-yellow-500"></i>}{mat.effectType === 'COST_REDUCTION' ? `耐久消耗 -${Math.round(mat.effectValue*100)}%` : mat.description}</div>
                        </div>
                        {isLocked ? <button disabled className="w-full py-3 bg-zinc-800 text-zinc-500 font-bold rounded-xl border border-zinc-700 text-base flex items-center justify-center gap-2 mt-auto"><i className="fas fa-lock"></i><span>LV.{unlockLevel} 解锁</span></button> : <button onClick={() => buyMaterial(mat)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-yellow-500 font-bold rounded-xl border border-zinc-700 text-2xl transition active:scale-95 flex items-center justify-center gap-2 mt-auto shadow-md"><i className="fas fa-coins text-lg"></i><span>{mat.price}</span></button>}
                      </div>
                    );
                })}
              </div>
            </div>
             <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h3 className="text-lg font-black mb-4 text-zinc-300 uppercase tracking-widest">出售成品</h3>
              <div className="grid grid-cols-2 gap-4">
                {player.inventory.map(item => {
                   const isEquipped = player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id;
                   return (
                    <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between relative group shadow-lg">
                        {isEquipped && <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded font-bold shadow z-10">已装备</div>}
                        <div><div className="flex justify-between items-start mb-4"><div className="flex items-center gap-4 overflow-hidden w-full"><div className={`w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-zinc-800 shrink-0 quality-${item.quality}`}><i className={`fas ${item.type === 'WEAPON' ? 'fa-khanda' : 'fa-shield-alt'} text-2xl`}></i></div><div className="min-w-0 flex-1"><div className={`font-bold text-lg quality-${item.quality} truncate`}>{item.name}</div><div className={`text-sm font-bold ${item.type === 'WEAPON' ? 'text-red-400' : 'text-blue-400'}`}>{item.type === 'WEAPON' ? '武器' : '防具'}</div></div></div></div><div className="bg-black/20 rounded-xl p-4 mb-4 space-y-2 border border-zinc-800/50">{item.stats.slice(0, 4).map((s:any, i:number) => <div key={i} className="flex justify-between text-base"><span className="text-zinc-300 font-bold">{s.label}</span><span className="text-zinc-200 font-bold">+{s.value}{s.suffix}</span></div>)}</div></div>
                        <button onClick={() => sellItem(item)} disabled={isEquipped} className={`w-full py-4 text-base font-bold rounded-xl border transition ${isEquipped ? 'opacity-30 cursor-not-allowed border-transparent bg-zinc-900 text-zinc-500' : 'bg-zinc-800 hover:bg-zinc-700 text-red-500 border-zinc-700 hover:border-red-500/50'}`}>出售 {item.value} G</button>
                    </div>
                   )
                })}
              </div>
             </div>
          </div>
        )}

        {activeTab === 'BAG' && (
           // REFACTORED BAG UI
           <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 h-full flex flex-col animate-fadeIn">
            {/* Player Stats Header */}
            <div className="mb-6 bg-zinc-900/80 rounded-2xl p-4 border border-zinc-700 shadow-md flex flex-col gap-4">
                <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center shadow-inner relative"><span className="text-2xl font-black italic text-white z-10">{player.level}</span><div className="absolute -bottom-1 text-[10px] font-bold bg-zinc-950 px-1.5 rounded text-zinc-400 border border-zinc-700 uppercase">Level</div></div><div><div className="text-sm font-bold text-zinc-300">锻造师</div><div className="text-xs text-zinc-500 font-mono">EXP {player.exp}/{player.maxExp}</div></div></div><div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-700/50"><i className="fas fa-coins text-yellow-500"></i><span className="font-mono font-bold text-yellow-400 text-lg">{player.gold}</span></div></div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 relative"><div className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{width: `${Math.min(100, (player.exp/player.maxExp)*100)}%`}}></div></div>
                <div className="grid grid-cols-5 gap-1 bg-zinc-950/30 p-2 rounded-xl border border-zinc-800">
                    <div className="flex flex-col items-center justify-center"><span className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5">生命</span><span className="text-sm font-black text-white">{totalStats.HP}</span></div>
                    <div className="flex flex-col items-center justify-center border-l border-zinc-800"><span className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5">攻击</span><span className="text-sm font-black text-white">{totalStats.ATK}</span></div>
                    <div className="flex flex-col items-center justify-center border-l border-zinc-800"><span className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5">防御</span><span className="text-sm font-black text-white">{totalStats.DEF}</span></div>
                    <div className="flex flex-col items-center justify-center border-l border-zinc-800"><span className="text-[10px] font-bold text-yellow-700 uppercase mb-0.5">暴击</span><span className="text-sm font-black text-yellow-500">{totalStats.CRIT}%</span></div>
                    <div className="flex flex-col items-center justify-center border-l border-zinc-800"><span className="text-[10px] font-bold text-red-800 uppercase mb-0.5">吸血</span><span className="text-sm font-black text-red-500">{totalStats.LIFESTEAL}%</span></div>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 flex gap-4">
                {/* WEAPON COLUMN */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="text-sm font-black text-red-400 uppercase tracking-widest mb-2 flex items-center justify-center bg-red-950/30 p-2 rounded-lg border border-red-900/30"><i className="fas fa-khanda mr-2"></i> 武器库</div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 p-1">
                        {weaponList.length === 0 && <div className="text-center text-zinc-600 py-8 italic text-xs">暂无武器</div>}
                        {weaponList.map(item => renderItemCard(item, () => setInspectItem(item), player.equippedWeapon?.id === item.id))}
                    </div>
                </div>
                {/* ARMOR COLUMN */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center justify-center bg-blue-950/30 p-2 rounded-lg border border-blue-900/30"><i className="fas fa-shield-alt mr-2"></i> 防具库</div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 p-1">
                        {armorList.length === 0 && <div className="text-center text-zinc-600 py-8 italic text-xs">暂无防具</div>}
                        {armorList.map(item => renderItemCard(item, () => setInspectItem(item), player.equippedArmor?.id === item.id))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Dungeon Interface */}
        {dungeon && (
             <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col animate-fadeIn">
                {/* NEW UNIFIED STATUS HEADER */}
                <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex flex-col gap-3 shadow-lg shrink-0 z-20">
                    <div className="flex justify-between items-center mb-0">
                        <div className="flex items-center gap-4 w-full">
                            <div className="bg-zinc-800 px-4 py-1 rounded-lg border border-zinc-700 flex items-center gap-2">
                                <span className="text-zinc-500 text-xs font-bold">DEPTH</span>
                                <span className="text-xl font-black text-red-500">{dungeon.depth}</span>
                            </div>
                            {/* Starvation Status */}
                            {dungeon.starvationDebuff && (
                                <div className="bg-red-950/80 px-3 py-1 rounded border border-red-500/50 flex items-center gap-2 animate-pulse">
                                    <i className="fas fa-exclamation-triangle text-red-500"></i>
                                    <span className="text-red-400 font-bold text-sm">力竭</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* RESOURCE STATUS BAR */}
                    <div className="grid grid-cols-4 gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                        {/* HP */}
                        <div className="col-span-2 flex flex-col justify-center border-r border-zinc-800 pr-2">
                            <div className="flex justify-between text-xs font-bold text-red-400 mb-1">
                                <span className="flex items-center gap-1"><i className="fas fa-heart"></i> 生命</span>
                                <span>{dungeon.currentHP}/{dungeon.maxHP}</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-red-600 transition-all" style={{width: `${(dungeon.currentHP/dungeon.maxHP)*100}%`}}></div>
                            </div>
                        </div>
                        {/* Supplies */}
                        <div className="flex flex-col justify-center items-center border-r border-zinc-800">
                             <div className={`text-2xl font-black ${dungeon.supplies === 0 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`}>{dungeon.supplies}</div>
                             <div className="text-[10px] text-zinc-500 font-bold uppercase"><i className="fas fa-bread-slice mr-1"></i>补给</div>
                        </div>
                        {/* Durability Mini Status */}
                        <div className="flex flex-col justify-center gap-1 pl-1">
                             <div className="flex items-center justify-between w-full">
                                 <div className="flex items-center gap-1"><i className="fas fa-khanda text-[10px] text-zinc-500"></i></div>
                                 <span className="text-[10px] font-mono text-zinc-400">{player.equippedWeapon ? `${player.equippedWeapon.currentDurability}/${player.equippedWeapon.maxDurability}` : '-'}</span>
                             </div>
                             <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mb-1"><div className="bg-blue-500 h-full" style={{width: player.equippedWeapon ? `${(player.equippedWeapon.currentDurability/player.equippedWeapon.maxDurability)*100}%` : '0%'}}></div></div>
                             
                             <div className="flex items-center justify-between w-full">
                                 <div className="flex items-center gap-1"><i className="fas fa-shield-alt text-[10px] text-zinc-500"></i></div>
                                 <span className="text-[10px] font-mono text-zinc-400">{player.equippedArmor ? `${player.equippedArmor.currentDurability}/${player.equippedArmor.maxDurability}` : '-'}</span>
                             </div>
                             <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{width: player.equippedArmor ? `${(player.equippedArmor.currentDurability/player.equippedArmor.maxDurability)*100}%` : '0%'}}></div></div>
                             
                             <div className="text-[8px] text-zinc-600 scale-90 origin-left mt-0.5">攻-1 / 受-1</div>
                        </div>
                    </div>

                    {/* PROGRESS BAR - MOVED HERE */}
                    <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase mr-2 shrink-0 tracking-wider">当前区域</span>
                        <div className="flex-1 flex justify-between items-center px-2">
                            {Array.from({length: 10}).map((_, i) => {
                                const currentStageProgress = (dungeon.depth - 1) % 10;
                                const isActive = i <= currentStageProgress;
                                return (
                                    <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'bg-zinc-800 border border-zinc-700'}`}></div>
                                )
                            })}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold ml-2 shrink-0 tracking-wider">BOSS</span>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative">
                    {/* Left: Event */}
                    <div className="flex-[3] flex flex-col relative border-b lg:border-b-0 lg:border-r border-zinc-800">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black opacity-50 -z-10"></div>
                        
                         {/* TOP LEFT STATUS OVERLAY (NEW) */}
                        <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none">
                            {dungeon.blessing && (
                                <div className="bg-purple-950/90 backdrop-blur border border-purple-500/50 px-3 py-2 rounded-xl shadow-lg flex items-start gap-3 max-w-[200px] animate-fadeIn">
                                    <div className="text-purple-400 text-xl mt-0.5"><i className="fas fa-pray"></i></div>
                                    <div>
                                        <div className="text-xs font-black text-purple-300 uppercase tracking-wider">{dungeon.blessing.name}</div>
                                        <div className="text-[10px] text-purple-200/80 leading-tight mt-0.5">{dungeon.blessing.description}</div>
                                    </div>
                                </div>
                            )}
                            {(dungeon.starvationDebuff || dungeon.supplies === 0) && (
                                <div className="bg-red-950/90 backdrop-blur border border-red-500/50 px-3 py-2 rounded-xl shadow-lg flex items-start gap-3 max-w-[200px] animate-pulse">
                                    <div className="text-red-500 text-xl mt-0.5"><i className="fas fa-exclamation-triangle"></i></div>
                                    <div>
                                        <div className="text-xs font-black text-red-400 uppercase tracking-wider">物资耗尽</div>
                                        <div className="text-[10px] text-red-300/80 leading-tight mt-0.5">攻击力降低 20%<br/>前进将扣除生命</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                            {dungeon.activeChoice ? (
                                <div className="w-full max-w-lg bg-zinc-900/90 border border-zinc-600 rounded-3xl p-8 backdrop-blur shadow-2xl animate-fadeIn">
                                     <h2 className="text-3xl font-black text-white mb-4 text-center">{dungeon.activeChoice.title}</h2>
                                     <p className="text-zinc-400 text-center mb-8 text-lg">{dungeon.activeChoice.desc}</p>
                                     <div className="flex flex-col gap-4">
                                         {dungeon.activeChoice.options.map((opt, i) => (
                                             <button key={i} onClick={opt.action} className={`w-full py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl font-bold text-lg transition active:scale-95 flex items-center justify-center gap-2 ${opt.style || 'text-white'}`}>
                                                 {opt.label}
                                             </button>
                                         ))}
                                     </div>
                                </div>
                            ) : dungeon.battle ? (
                                <div className="w-full max-w-lg bg-zinc-900/80 border border-red-900/50 rounded-3xl p-6 backdrop-blur-sm animate-bounce-in shadow-2xl">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="text-center w-24">
                                            <div className="text-blue-500 text-5xl mb-2"><i className="fas fa-user-shield"></i></div>
                                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-blue-900/30"><div className="h-full bg-blue-500 transition-all duration-300" style={{width: `${(dungeon.currentHP/dungeon.maxHP)*100}%`}}></div></div>
                                        </div>
                                        <div className="text-3xl font-black text-zinc-700 italic">VS</div>
                                        <div className="text-center w-24">
                                            <div className="text-red-500 text-5xl mb-2"><i className="fas fa-dragon"></i></div>
                                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-red-900/30"><div className="h-full bg-red-500 transition-all duration-300" style={{width: `${(dungeon.battle.monsterHP/dungeon.battle.monsterMaxHP)*100}%`}}></div></div>
                                        </div>
                                    </div>
                                    <div className="text-center mb-6">
                                        <div className="text-xl font-black text-red-400">{dungeon.battle.monsterName}</div>
                                        <div className="text-sm text-zinc-500 font-bold mt-1">正在交战...</div>
                                    </div>

                                    {!dungeon.battle.isStarted ? <button onClick={startBattle} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xl shadow-lg transition active:scale-95 uppercase tracking-widest border border-red-400/20">开始战斗</button> : dungeon.battle.isFinished ? <div className="flex gap-3">{dungeon.battle.victory ? <><button onClick={() => proceedDungeon()} className="flex-[2] py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-xl shadow-lg transition active:scale-95 border border-green-400/20">继续探索 <i className="fas fa-arrow-right ml-2"></i></button><button onClick={withdraw} className="flex-1 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-xl text-lg shadow-lg transition active:scale-95 border border-yellow-400/20">撤退</button></> : <button onClick={handleDeath} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-red-500 font-black rounded-xl text-xl shadow-lg transition active:scale-95 border border-red-900/50">你被打败了...</button>}</div> : <div className="text-center text-zinc-400 font-bold animate-pulse text-lg py-2">战斗进行中...</div>}
                                </div>
                            ) : (
                                <div className="text-center animate-fadeIn w-full max-w-md">
                                    {dungeon.lastEventResult && (
                                        <div className="mb-8 p-6 bg-zinc-900/40 rounded-3xl border border-white/5 backdrop-blur-sm">
                                            <div className={`text-8xl mb-6 drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] transform hover:scale-110 transition duration-500 ${dungeon.lastEventResult.color}`}><i className={`fas ${dungeon.lastEventResult.icon}`}></i></div>
                                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">{dungeon.lastEventResult.title}</h2>
                                            <p className={`text-xl font-bold ${dungeon.lastEventResult.color}`}>{dungeon.lastEventResult.desc}</p>
                                        </div>
                                    )}
                                    {!dungeon.isProcessing && (
                                        <div className="w-full">
                                            {dungeon.supplies === 0 && (
                                                <div className="bg-red-950/50 border border-red-500/30 p-3 rounded-xl mb-4 text-center animate-pulse">
                                                    <div className="text-red-400 font-bold text-sm"><i className="fas fa-exclamation-circle mr-1"></i> 补给耗尽警告</div>
                                                    <div className="text-red-300/70 text-xs mt-1">攻击力-20% | 前进将扣除5%生命</div>
                                                </div>
                                            )}
                                            <div className="flex gap-3 justify-center w-full">
                                                <button onClick={() => proceedDungeon()} className="flex-[2] py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-2xl shadow-xl transition transform active:scale-95 tracking-widest uppercase border border-green-400/20">继续探索</button>
                                                <button onClick={withdraw} className="flex-1 py-5 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-2xl text-xl shadow-xl transition transform active:scale-95 border border-yellow-400/20">撤退</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Logs */}
                        <div className="h-48 md:h-64 bg-black/60 border-t border-zinc-800 flex flex-col">
                            <div className="px-4 py-2 bg-zinc-900/80 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center border-b border-zinc-800"><span><i className="fas fa-scroll mr-1"></i> 冒险日志</span><span>FLOOR {dungeon.depth}</span></div>
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1.5 scrollbar-thin" ref={dungeonLogRef}>{dungeon.log.map((l: string, i: number) => <div key={i} className={`flex gap-2 ${i===0 ? 'text-white font-bold' : 'text-zinc-500'}`}><span className="opacity-50 select-none">&gt;</span><span>{l}</span></div>)}</div>
                        </div>
                    </div>
                    {/* Loot - LIST LAYOUT */}
                    <div className="flex-[2] bg-zinc-900 flex flex-col border-l border-zinc-800 min-w-[300px]">
                        <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-between shrink-0">
                            <h3 className="font-black text-zinc-300 uppercase tracking-wider text-sm"><i className="fas fa-sack-dollar mr-2 text-yellow-500"></i> 战利品背包</h3>
                            <div className="bg-zinc-950 px-3 py-1 rounded text-xs font-bold text-zinc-400 border border-zinc-700">
                                {dungeon.loot.materials.length + dungeon.loot.inventory.length}/{dungeon.maxBagCapacity}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-2">
                             {/* Gold Row */}
                             <div className="bg-zinc-950 border border-yellow-900/30 p-3 rounded-lg flex items-center gap-3 shadow-sm h-16">
                                <div className="w-10 h-10 rounded bg-yellow-900/20 flex items-center justify-center text-yellow-500 shrink-0"><i className="fas fa-coins text-xl"></i></div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-yellow-100 font-bold truncate">金币</div>
                                    <div className="text-xs text-yellow-500/50 truncate">副本收益</div>
                                </div>
                                <div className="ml-auto text-xl font-black text-yellow-500 font-mono">+{dungeon.loot.gold}</div>
                             </div>

                             {/* Items List */}
                             {Array.from({ length: dungeon.maxBagCapacity }).map((_, i) => {
                                 const allItems = [...dungeon.loot.inventory, ...dungeon.loot.materials];
                                 const item = allItems[i];
                                 
                                 if (!item) {
                                     // Empty Slot
                                     return (
                                         <div key={i} className="h-16 border-2 border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 text-xs font-bold uppercase">
                                             空槽位
                                         </div>
                                     );
                                 }

                                 // Item Row
                                 const isEquip = 'stats' in item;
                                 return (
                                    <div key={i} className={`h-16 bg-zinc-800 border rounded-lg p-2 flex items-center gap-3 relative overflow-hidden group quality-${item.quality} ${isEquip ? 'border-zinc-600' : 'border-zinc-700'}`}>
                                        <div className={`w-12 h-12 rounded bg-black/40 flex items-center justify-center text-2xl quality-${item.quality} shrink-0`}>
                                            <i className={`fas ${isEquip ? (item.type === 'WEAPON' ? 'fa-khanda' : 'fa-shield-alt') : (item.isDungeonOnly ? 'fa-gem' : 'fa-cube')}`}></i>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`font-bold text-sm truncate quality-${item.quality}`}>{item.name}</div>
                                            <div className="text-xs opacity-60 truncate font-bold text-zinc-500 uppercase mt-0.5">{isEquip ? (item.type==='WEAPON'?'武器':'防具') : '材料'}</div>
                                        </div>
                                        {/* Optional: Show value or quality indicator */}
                                    </div>
                                 )
                             })}
                             
                             <div className="pt-2 pb-6 text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                 容量已满时需丢弃才能拾取
                             </div>
                        </div>
                    </div>
                </div>
             </div>
        )}

        {/* Dungeon Selection & Prep Screen */}
        {!dungeon && activeTab === 'DUNGEON' && (
             <div className="h-full flex flex-col items-center justify-center animate-fadeIn bg-zinc-900 p-8 rounded-2xl border border-zinc-700 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
                 
                 {!isPrepMode ? (
                     <div className="z-10 text-center max-w-lg w-full flex flex-col h-full justify-center">
                         <div className="mb-auto mt-8"><i className="fas fa-dungeon text-8xl text-zinc-700 mb-6 block animate-pulse"></i><h2 className="text-5xl font-black text-white mb-4 uppercase tracking-widest">深渊远征</h2></div>
                         <button onClick={openDungeonPrep} className="mb-auto w-full py-6 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black rounded-2xl text-3xl shadow-[0_0_40px_rgba(220,38,38,0.4)] transition transform active:scale-95 uppercase tracking-widest flex items-center justify-center gap-4 group"><span className="group-hover:translate-x-1 transition-transform">前往整备</span><i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i></button>
                     </div>
                 ) : (
                     <div className="z-10 w-full max-w-2xl bg-zinc-800/90 backdrop-blur rounded-3xl border border-zinc-600 shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                         <div className="p-6 border-b border-zinc-700 flex justify-between items-center bg-zinc-900"><h2 className="text-2xl font-black text-white uppercase tracking-widest"><i className="fas fa-clipboard-list mr-2"></i> 行前整备</h2><button onClick={() => setIsPrepMode(false)} className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white"><i className="fas fa-times"></i></button></div>
                         
                         <div className="flex-1 overflow-y-auto p-6 space-y-6">
                             {/* Floor Selection */}
                             <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                                 <label className="text-sm font-bold text-zinc-500 uppercase mb-4 block">选择入口</label>
                                 <div className="flex items-center justify-between gap-4">
                                     <button onClick={handlePrevFloor} disabled={currentFloorIndex <= 0} className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-700"><i className="fas fa-chevron-left"></i></button>
                                     <div className="text-center"><div className="text-4xl font-black text-white">第 {selectedStartFloor} 层</div><div className="text-xs text-red-400 font-bold mt-1">入场费: {selectedStartFloor === 1 ? 0 : selectedStartFloor * 10} G</div></div>
                                     <button onClick={handleNextFloor} disabled={currentFloorIndex >= player.unlockedFloors.length - 1} className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-700"><i className="fas fa-chevron-right"></i></button>
                                 </div>
                             </div>

                             {/* Repair Station - UPDATED WITH COSTS */}
                             <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                                 <div className="flex justify-between items-center mb-4"><div className="text-lg font-black text-white"><i className="fas fa-hammer text-blue-400 mr-2"></i>装备维护</div></div>
                                 <div className="grid grid-cols-2 gap-4 mb-4">
                                     {/* Weapon Repair */}
                                     <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col">
                                         <div className="text-xs text-zinc-500 mb-1">武器耐久</div>
                                         {player.equippedWeapon ? (
                                             <>
                                                <div className="text-white font-bold">{player.equippedWeapon.currentDurability}/{player.equippedWeapon.maxDurability}</div>
                                                <div className="text-xs text-orange-400 mt-1">维修费: {(player.equippedWeapon.maxDurability - player.equippedWeapon.currentDurability) * DUNGEON_CONFIG.REPAIR_COST_PER_POINT} G</div>
                                                <button onClick={() => {
                                                    const w = player.equippedWeapon!;
                                                    const cost = (w.maxDurability - w.currentDurability) * DUNGEON_CONFIG.REPAIR_COST_PER_POINT;
                                                    if (cost <= 0) return;
                                                    if (player.gold < cost) return alert('金币不足');
                                                    setPlayer(p => ({...p, gold: p.gold - cost, equippedWeapon: {...w, currentDurability: w.maxDurability}}));
                                                }} disabled={player.equippedWeapon.currentDurability >= player.equippedWeapon.maxDurability} className="mt-2 text-xs bg-blue-900/50 text-blue-300 py-1.5 rounded disabled:opacity-30">修复</button>
                                             </>
                                         ) : <div className="text-zinc-600 italic">未装备</div>}
                                     </div>
                                     {/* Armor Repair */}
                                     <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col">
                                         <div className="text-xs text-zinc-500 mb-1">防具耐久</div>
                                         {player.equippedArmor ? (
                                             <>
                                                <div className="text-white font-bold">{player.equippedArmor.currentDurability}/{player.equippedArmor.maxDurability}</div>
                                                <div className="text-xs text-orange-400 mt-1">维修费: {(player.equippedArmor.maxDurability - player.equippedArmor.currentDurability) * DUNGEON_CONFIG.REPAIR_COST_PER_POINT} G</div>
                                                <button onClick={() => {
                                                    const a = player.equippedArmor!;
                                                    const cost = (a.maxDurability - a.currentDurability) * DUNGEON_CONFIG.REPAIR_COST_PER_POINT;
                                                    if (cost <= 0) return;
                                                    if (player.gold < cost) return alert('金币不足');
                                                    setPlayer(p => ({...p, gold: p.gold - cost, equippedArmor: {...a, currentDurability: a.maxDurability}}));
                                                }} disabled={player.equippedArmor.currentDurability >= player.equippedArmor.maxDurability} className="mt-2 text-xs bg-blue-900/50 text-blue-300 py-1.5 rounded disabled:opacity-30">修复</button>
                                             </>
                                         ) : <div className="text-zinc-600 italic">未装备</div>}
                                     </div>
                                 </div>
                                 <button onClick={repairAll} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded-xl font-bold transition">一键全修</button>
                             </div>

                             {/* Supplies */}
                             <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                                 <div className="flex justify-between items-center mb-4"><div className="text-lg font-black text-white"><i className="fas fa-bread-slice text-orange-400 mr-2"></i>行军干粮</div><div className="text-orange-400 font-mono font-bold text-lg">{DUNGEON_CONFIG.SUPPLY_COST} G / 份</div></div>
                                 <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                     <input type="range" min="0" max="20" value={prepSupplies} onChange={e => setPrepSupplies(Number(e.target.value))} className="flex-1 accent-orange-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"/>
                                     <div className="w-16 text-center font-black text-3xl text-yellow-500">{prepSupplies}</div>
                                 </div>
                                 <div className="text-sm text-zinc-400 mt-3 text-right font-bold">小计: <span className="text-yellow-500 text-xl font-black">{prepSupplies * DUNGEON_CONFIG.SUPPLY_COST}</span> G</div>
                             </div>

                             {/* Blessings - UPDATED TO HIDE EFFECT */}
                             <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                                 <div className="text-lg font-black text-white mb-4"><i className="fas fa-pray text-purple-400 mr-2"></i>女神祝福 (可选)</div>
                                 <div className="grid grid-cols-3 gap-3">
                                     {[1, 2, 3].map(tier => (
                                         <button key={tier} onClick={() => purchaseBlessing(tier as BlessingTier)} disabled={false} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition relative overflow-hidden ${prepBlessing?.tier === tier ? 'bg-purple-900/50 border-purple-400' : 'bg-zinc-800 border-zinc-600 hover:border-zinc-500'}`}>
                                             {prepBlessing?.tier === tier && <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-bl font-bold">已选</div>}
                                             <div className="text-sm font-bold text-zinc-300">{tier === 1 ? '初级' : tier === 2 ? '中级' : '高级'}祈祷</div>
                                             <div className="text-xl font-black text-yellow-500">{[0, 200, 800, 2000][tier]}G</div>
                                         </button>
                                     ))}
                                 </div>
                                 {prepBlessing && (
                                     <div className="mt-4 bg-purple-900/20 border border-purple-500/50 p-4 rounded-xl text-center">
                                         <div className="font-bold text-purple-300 text-lg mb-1">女神的恩赐</div>
                                         <div className="text-sm text-purple-200/50 italic">??? (效果将在进入深渊后揭晓)</div>
                                     </div>
                                 )}
                             </div>
                         </div>

                         <div className="p-6 border-t border-zinc-700 bg-zinc-900 flex justify-between items-center shrink-0">
                             <div className="text-left"><div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">预计总花费</div><div className="text-4xl font-black text-yellow-500">{(selectedStartFloor * 10) + (prepSupplies * DUNGEON_CONFIG.SUPPLY_COST) + (prepBlessing ? [0, 200, 800, 2000][prepBlessing.tier] : 0)} G</div></div>
                             <button onClick={launchDungeon} className="px-10 py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-2xl shadow-lg transition active:scale-95">出发</button>
                         </div>
                     </div>
                 )}
             </div>
        )}

      </main>

      {/* Footer Navigation */}
      {!dungeon && (
        <footer className="mt-4 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl shadow-xl shrink-0 z-10 grid grid-cols-4 gap-2">
            {[
                { id: 'FORGE', icon: 'fa-hammer', label: '锻造' },
                { id: 'SHOP', icon: 'fa-store', label: '商店' },
                { id: 'BAG', icon: 'fa-box', label: '背包' },
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