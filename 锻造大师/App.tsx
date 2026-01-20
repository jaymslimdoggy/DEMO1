
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Player, Material, Quality, Equipment, EquipmentType, QualityColors, QualityNames, DungeonState, Stat } from './types';
import { MATERIALS, INITIAL_GOLD } from './constants';
import { generateEquipment } from './services/gameLogic';

interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'exp';
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
  const [forgeSlots, setForgeSlots] = useState<(Material | null)[]>([null, null, null]);
  const [forgeType, setForgeType] = useState<EquipmentType>('WEAPON');
  const [showResult, setShowResult] = useState<Equipment | null>(null);
  const [isForging, setIsForging] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const floatingIdCounter = useRef(0);
  const [dungeon, setDungeon] = useState<(DungeonState & { currentEvent?: string; isProcessing?: boolean; lastHealDepth: number }) | null>(null);
  const [selectedStartFloor, setSelectedStartFloor] = useState(0);

  useEffect(() => {
    const savedData = localStorage.getItem('shingbing_forge_save_v2');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPlayer({ ...initialPlayerState, ...parsed });
      } catch (e) {
        console.error("存档解析失败:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shingbing_forge_save_v2', JSON.stringify(player));
  }, [player]);

  const resetGame = () => {
    if (window.confirm("确定要删除所有进度重新开始吗？")) {
      localStorage.removeItem('shingbing_forge_save_v2');
      setPlayer(initialPlayerState);
      window.location.reload();
    }
  };

  const totalStats = useMemo(() => {
    const stats = { ...player.baseStats };
    const applyItemStats = (item: Equipment | null) => {
      if (!item) return;
      item.stats.forEach((s: Stat) => {
        if (s.type in stats) {
          (stats as any)[s.type] += s.value;
        }
      });
    };
    applyItemStats(player.equippedWeapon);
    applyItemStats(player.equippedArmor);
    return stats;
  }, [player]);

  const addFloatingText = (text: string, type: 'damage' | 'heal' | 'exp', isPlayer: boolean) => {
    const id = ++floatingIdCounter.current;
    const x = isPlayer ? -60 : 60;
    const newText: FloatingText = { id, text, type, x, y: -20 };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1200);
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
        if (newBaseStats.CRIT < 20) {
          newBaseStats.CRIT = Math.min(20, newBaseStats.CRIT + 2);
        }
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

  const debugGold = () => {
    setPlayer(prev => ({ ...prev, gold: prev.gold + 1000 }));
  };

  const debugExp = () => {
    gainExp(200);
    addFloatingText("+200 XP", 'exp', true);
  };

  const addToForge = (mat: Material, index: number) => {
    const newSlots = [...forgeSlots];
    newSlots[index] = mat;
    setForgeSlots(newSlots);
    setPlayer(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== mat.id)
    }));
  };

  const removeFromForge = (index: number) => {
    const mat = forgeSlots[index];
    if (!mat) return;
    const newSlots = [...forgeSlots];
    newSlots[index] = null;
    setForgeSlots(newSlots);
    setPlayer(prev => ({
      ...prev,
      materials: [...prev.materials, mat]
    }));
  };

  const handleForge = () => {
    const activeMaterials = forgeSlots.filter((s): s is Material => s !== null);
    if (activeMaterials.length === 0) return;
    setIsForging(true);
    setTimeout(() => {
      const qualities = activeMaterials.map(m => m.quality);
      const result = generateEquipment(forgeType, qualities, player.level);
      setShowResult(result);
      setPlayer(prev => ({ ...prev, inventory: [...prev.inventory, result] }));
      setForgeSlots([null, null, null]);
      setIsForging(false);
    }, 800);
  };

  const sellItem = (item: Equipment) => {
    if (player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id) {
      alert('无法出售已装备的物品！');
      return;
    }
    setPlayer(prev => ({
      ...prev,
      gold: prev.gold + item.value,
      inventory: prev.inventory.filter(i => i.id !== item.id),
    }));
  };

  const equipItem = (item: Equipment) => {
    setPlayer(prev => {
      if (item.type === 'WEAPON') return { ...prev, equippedWeapon: item };
      return { ...prev, equippedArmor: item };
    });
  };

  const startDungeon = () => {
    const startDepth = selectedStartFloor * 10;
    setDungeon({
      depth: startDepth,
      currentHP: totalStats.HP,
      maxHP: totalStats.HP,
      loot: { gold: 0, materials: [], inventory: [], exp: 0 },
      log: [`你步入了深渊遗迹 (起点: 第${startDepth}关)...`],
      isDead: false,
      currentEvent: '远征开始',
      lastHealDepth: startDepth
    });
  };

  const addLog = (msg: string) => {
    setDungeon(prev => prev ? ({ ...prev, log: [msg, ...prev.log].slice(0, 30) }) : null);
  };

  const proceedDungeon = () => {
    if (!dungeon || dungeon.isDead || dungeon.isProcessing || dungeon.battle) return;
    setDungeon(prev => prev ? ({ ...prev, isProcessing: true }) : null);
    
    setTimeout(() => {
      const nextDepth = (dungeon?.depth || 0) + 1;
      const isBossStage = nextDepth % 10 === 0;
      const depthBoost = nextDepth;
      const expScale = 1 + Math.floor(nextDepth / 10) * 0.5;

      setPlayer(prev => ({
        ...prev,
        maxDungeonDepth: Math.max(prev.maxDungeonDepth, nextDepth)
      }));

      if (isBossStage) {
        const monsterMaxHP = 150 + depthBoost * 35;
        setDungeon(prev => prev ? ({
          ...prev, depth: nextDepth, currentEvent: '首领房间', isProcessing: false,
          battle: {
            monsterName: `【首领】毁灭领主 等级.${depthBoost}`,
            monsterMaxHP, monsterHP: monsterMaxHP, monsterATK: 15 + Math.floor(depthBoost * 5),
            isFinished: false, victory: false
          }
        }) : null);
        addLog(`[警告] 第${nextDepth}关，首领房间！`);
        return;
      }

      const eventRoll = Math.random();
      const mustHeal = (nextDepth - dungeon.lastHealDepth) >= 15;
      
      if ((nextDepth > 5 && eventRoll >= 0.9) || mustHeal) {
        const heal = Math.floor(totalStats.HP * 0.4);
        setDungeon(prev => prev ? ({ 
          ...prev, depth: nextDepth, currentHP: Math.min(prev.maxHP, prev.currentHP + heal), 
          currentEvent: '休整营地', isProcessing: false, lastHealDepth: nextDepth
        }) : null);
        addLog(`[第${nextDepth}关] 发现了安全的营地，回复了 ${heal} 生命值。`);
      } 
      else if (eventRoll < 0.35) {
        const monsterMaxHP = 40 + depthBoost * 20;
        setDungeon(prev => prev ? ({
          ...prev, depth: nextDepth, currentEvent: '遭遇怪物', isProcessing: false,
          battle: {
            monsterName: `守卫者 等级.${depthBoost}`,
            monsterMaxHP, monsterHP: monsterMaxHP, monsterATK: 8 + Math.floor(depthBoost * 3.5),
            isFinished: false, victory: false
          }
        }) : null);
        addLog(`[第${nextDepth}关] 遭遇怪物！`);
      } 
      else {
        const foundRoll = Math.random();
        const foundGold = Math.floor(Math.random() * 15 * depthBoost);
        const foundExp = Math.floor((12 + Math.random() * 6) * expScale);
        let matIndex = 0;
        if (foundRoll > 0.98) matIndex = 2;
        else if (foundRoll > 0.7) matIndex = 1;
        const newMat = { ...MATERIALS[matIndex], id: Math.random().toString() };
        
        gainExp(foundExp);
        addFloatingText(`+${foundExp} XP`, 'exp', true);

        setDungeon(prev => prev ? ({
          ...prev, depth: nextDepth, currentEvent: '搜刮废墟', isProcessing: false,
          loot: { ...prev.loot, gold: prev.loot.gold + foundGold, materials: [...prev.loot.materials, newMat] }
        }) : null);
        addLog(`[第${nextDepth}关] 搜刮了废墟，获得了 ${foundGold} 金币和 ${foundExp} 经验。`);
      }
    }, 400);
  };

  const startBattle = async () => {
    if (!dungeon || !dungeon.battle || dungeon.battle.isFinished) return;
    
    setDungeon(prev => prev ? ({
      ...prev, 
      battle: prev.battle ? { ...prev.battle, isStarted: true } as any : undefined 
    }) : null);

    let mHP = dungeon.battle.monsterHP;
    let pHP = dungeon.currentHP;
    const mATK = dungeon.battle.monsterATK;
    const pATK = totalStats.ATK;
    const pCRIT = totalStats.CRIT;
    const pDEF = totalStats.DEF;
    const pLIFESTEAL = totalStats.LIFESTEAL;

    while (mHP > 0 && pHP > 0) {
      const isCrit = Math.random() * 100 < pCRIT;
      const pDmg = Math.floor(pATK * (isCrit ? 1.5 : 1));
      const heal = Math.floor(pDmg * (pLIFESTEAL / 100));
      mHP = Math.max(0, mHP - pDmg);
      pHP = Math.min(dungeon.maxHP, pHP + heal);
      
      addFloatingText(`-${pDmg}${isCrit ? '!' : ''}`, 'damage', false);
      if (heal > 0) addFloatingText(`+${heal}`, 'heal', true);
      
      setDungeon(prev => prev ? ({
        ...prev, currentHP: pHP,
        battle: prev.battle ? { ...prev.battle, monsterHP: mHP } : undefined
      }) : null);
      if (mHP <= 0) break;
      await new Promise(r => setTimeout(r, 600));

      const mDmg = Math.max(1, mATK - pDEF);
      pHP = Math.max(0, pHP - mDmg);
      addFloatingText(`-${mDmg}`, 'damage', true);
      
      setDungeon(prev => prev ? ({ ...prev, currentHP: pHP }) : null);
      if (pHP <= 0) break;
      await new Promise(r => setTimeout(r, 600));
    }

    const victory = mHP <= 0;
    if (victory) {
      const isBoss = dungeon.depth % 10 === 0;
      const expScale = 1 + Math.floor(dungeon.depth / 10) * 0.5;
      const battleExp = isBoss ? Math.floor(100 * expScale) : Math.floor(30 * expScale);
      
      gainExp(battleExp);
      addFloatingText(`+${battleExp} XP`, 'exp', true);

      let newItem = null;
      let newMat = null;
      if (isBoss) {
        newItem = generateEquipment(Math.random() > 0.5 ? 'WEAPON' : 'ARMOR', [Quality.Rare, Quality.Refined, Quality.Refined], player.level, true);
        newMat = { ...MATERIALS[2], id: Math.random().toString() };
      } else {
        const dropRoll = Math.random();
        if (dropRoll < 0.5) {
          newItem = generateEquipment(Math.random() > 0.5 ? 'WEAPON' : 'ARMOR', [Quality.Common, Quality.Refined, Quality.Common], player.level);
        } else {
          const matRoll = Math.random();
          let matIndex = 0;
          if (matRoll > 0.95) matIndex = 2; 
          else if (matRoll > 0.7) matIndex = 1; 
          newMat = { ...MATERIALS[matIndex], id: Math.random().toString() };
        }
      }
      setDungeon(prev => {
        if (!prev) return null;
        const nextLoot = { ...prev.loot };
        if (newItem) nextLoot.inventory = [...nextLoot.inventory, newItem];
        if (newMat) nextLoot.materials = [...nextLoot.materials, newMat];
        return { ...prev, isDead: false, battle: prev.battle ? { ...prev.battle, isFinished: true, victory: true } : undefined, loot: nextLoot };
      });
      addLog(`[胜利] 战斗结束，即时获得了 ${battleExp} 经验。`);
    } else {
      setDungeon(prev => prev ? ({ ...prev, isDead: true, battle: prev.battle ? { ...prev.battle, isFinished: true, victory: false } : undefined }) : null);
      addLog(`[战败] 你倒在了血泊中。已获经验已保存。`);
    }
  };

  const closeBattle = () => setDungeon(prev => prev ? ({ ...prev, battle: undefined }) : null);

  const withdraw = () => {
    if (!dungeon) return;
    setPlayer(prev => ({
      ...prev, gold: prev.gold + dungeon.loot.gold,
      materials: [...prev.materials, ...dungeon.loot.materials],
      inventory: [...prev.inventory, ...dungeon.loot.inventory]
    }));
    setDungeon(null);
    setActiveTab('BAG');
  };

  const handleDeath = () => {
    setPlayer(prev => ({
      ...prev, equippedWeapon: null, equippedArmor: null,
      inventory: prev.inventory.filter(item => item.id !== prev.equippedWeapon?.id && item.id !== prev.equippedArmor?.id)
    }));
    setDungeon(null);
    setActiveTab('FORGE');
  };

  const bossProgress = dungeon ? (dungeon.depth % 10 === 0 && dungeon.depth !== 0 ? 100 : (dungeon.depth % 10) * 10) : 0;
  const stepsToBoss = dungeon ? 10 - (dungeon.depth % 10) : 10;

  // 计算可选择的起始层级
  const availableStartFloors = useMemo(() => {
    const maxFloor = Math.floor(player.maxDungeonDepth / 10);
    const floors = [];
    for (let i = 0; i <= maxFloor; i++) {
      floors.push(i);
    }
    return floors;
  }, [player.maxDungeonDepth]);

  const changeStartFloor = (delta: number) => {
    const next = selectedStartFloor + delta;
    if (next >= 0 && next < availableStartFloors.length) {
      setSelectedStartFloor(next);
    }
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto flex flex-col p-4 md:p-6 pb-28 relative overflow-hidden h-screen">
      {showResult && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-zinc-800 border-2 border-yellow-500 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(234,179,8,0.3)] text-center">
            <h2 className="text-2xl font-black mb-2 text-zinc-100 italic tracking-widest uppercase">锻造成功！</h2>
            <div className={`text-3xl font-black mb-6 quality-${showResult.quality}`}>{showResult.name}</div>
            <div className="bg-zinc-900 rounded-2xl p-6 mb-8 border border-zinc-700">
              <div className="space-y-3">
                {showResult.stats.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-500 font-bold">{s.label}</span>
                    <span className="text-xl font-black text-green-400">+{s.value}{s.suffix}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setShowResult(null)} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black rounded-xl transition shadow-lg tracking-widest uppercase">收进行囊</button>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-6 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg shrink-0 z-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-yellow-500 tracking-wider">锻造大师</h1>
          <div className="flex gap-2 mt-1">
             <button onClick={debugGold} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-yellow-500 px-3 py-1 rounded border border-zinc-600 transition">调试金币</button>
             <button onClick={debugExp} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-purple-400 px-3 py-1 rounded border border-zinc-600 transition">调试经验</button>
             <button onClick={resetGame} className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1 rounded border border-red-900/30 transition">重置存档</button>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center text-yellow-400 text-2xl font-bold justify-end"><i className="fas fa-coins mr-2"></i>{player.gold}</div>
          <div className="text-sm text-zinc-500 font-bold uppercase tracking-wider">金币</div>
        </div>
      </header>

      <div className="flex flex-col gap-3 mb-6 shrink-0 z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(totalStats).map(([key, val]) => (
            <div key={key} className="stat-card p-3 rounded-lg border border-zinc-800 text-center">
              <div className="text-xs text-zinc-500 mb-1 uppercase tracking-tighter">{key === 'HP' ? '生命' : key === 'ATK' ? '攻击' : key === 'DEF' ? '防御' : key === 'CRIT' ? '暴击' : '吸血'}</div>
              <div className="text-xl font-bold text-zinc-200">{val}{(key === 'CRIT' || key === 'LIFESTEAL') ? '%' : ''}</div>
            </div>
          ))}
        </div>
        <div className="stat-card p-4 rounded-xl border border-zinc-800 flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-zinc-500 font-bold uppercase tracking-widest">等级</span>
              <span className="text-3xl font-black text-white italic leading-none">{player.level}</span>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              EXP <span className="text-zinc-300">{player.exp}</span> / {player.maxExp}
            </div>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700/30">
            <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500" style={{ width: `${(player.exp / player.maxExp) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
        {activeTab === 'FORGE' && (
          <div className="space-y-6 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 text-center relative overflow-hidden shrink-0">
              {isForging && (
                <div className="absolute inset-0 bg-zinc-900/60 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                   <i className="fas fa-hammer text-6xl text-orange-500 animate-bounce mb-4"></i>
                   <div className="text-2xl font-black text-white tracking-widest animate-pulse">精雕细琢中...</div>
                </div>
              )}
              <h2 className="text-2xl mb-4 font-bold flex items-center justify-center"><i className="fas fa-fire-alt mr-2 text-orange-500"></i> 铁匠铺</h2>
              <div className="flex justify-center gap-4 mb-8">
                <button onClick={() => setForgeType('WEAPON')} className={`px-8 py-3 rounded-full border transition text-lg ${forgeType === 'WEAPON' ? 'bg-orange-600 border-orange-400 text-white' : 'border-zinc-600 text-zinc-400'}`}>锻造武器</button>
                <button onClick={() => setForgeType('ARMOR')} className={`px-8 py-3 rounded-full border transition text-lg ${forgeType === 'ARMOR' ? 'bg-blue-600 border-blue-400 text-white' : 'border-zinc-600 text-zinc-400'}`}>锻造防具</button>
              </div>
              <div className="flex justify-center items-center gap-6 mb-8">
                {forgeSlots.map((slot, i) => (
                  <div key={i} onClick={() => removeFromForge(i)} className={`forge-slot cursor-pointer hover:scale-105 ${slot ? 'filled bg-quality-' + slot.quality : ''}`}>
                    {slot ? <div className={`text-center text-xs p-1 leading-tight font-bold quality-${slot.quality}`}>{slot.name}</div> : <i className="fas fa-plus text-zinc-700 text-xl"></i>}
                  </div>
                ))}
              </div>
              <button disabled={forgeSlots.every(s => s === null) || isForging} onClick={handleForge} className={`w-full max-sm py-5 text-white font-black text-xl rounded-xl shadow-xl active:scale-95 transition tracking-widest ${isForging ? 'bg-zinc-700 opacity-50' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'}`}>
                {isForging ? '锻造中...' : '开始锻造'}
              </button>
            </div>
            <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 flex-1 min-h-0">
              <h3 className="text-lg font-bold text-zinc-500 mb-4 uppercase tracking-widest flex items-center"><i className="fas fa-gem mr-2"></i>材料库</h3>
              <div className="flex flex-wrap gap-4 overflow-y-auto max-h-48 scrollbar-thin p-1">
                {player.materials.length === 0 && <div className="text-zinc-600 text-lg py-4 italic w-full text-center">暂无可用材料</div>}
                {player.materials.map(mat => (
                  <button key={mat.id} onClick={() => { const emptyIndex = forgeSlots.findIndex(s => s === null); if (emptyIndex !== -1) addToForge(mat, emptyIndex); }} className={`p-3 rounded-lg border border-zinc-600 bg-zinc-900 text-sm quality-${mat.quality} font-bold hover:bg-zinc-700 transition`}>{mat.name}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SHOP' && (
          <div className="space-y-6 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h2 className="text-2xl mb-6 font-bold flex items-center"><i className="fas fa-store mr-2 text-green-500"></i> 材料商人</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MATERIALS.map(mat => (
                  <div key={mat.id} className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 flex flex-col items-center shadow-inner">
                    <div className={`text-5xl mb-4 quality-${mat.quality}`}><i className="fas fa-gem"></i></div>
                    <div className={`font-bold text-lg mb-2 quality-${mat.quality}`}>{mat.name}</div>
                    <button onClick={() => buyMaterial(mat)} className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 text-yellow-400 font-bold rounded-lg mt-4 transition text-lg">购买 {mat.price}G</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h3 className="text-xl font-bold mb-4 text-zinc-400">装备回收</h3>
              <div className="grid grid-cols-1 gap-4">
                {player.inventory.map(item => {
                  const isEquipped = player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id;
                  return (
                    <div key={item.id} className={`bg-zinc-900 p-5 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center transition ${isEquipped ? 'border-blue-500/50' : 'border-zinc-800 hover:border-zinc-600'}`}>
                      <div>
                        <div className={`font-bold text-xl quality-${item.quality}`}>{item.name} {isEquipped && <span className="text-xs bg-blue-600 px-2 py-0.5 rounded ml-2 font-bold shadow-sm">已装备</span>}</div>
                        <div className="flex flex-wrap gap-x-4 mt-2">
                          {item.stats.map((s, i) => <span key={i} className="text-sm text-zinc-500">{s.label}: <span className="text-zinc-300 font-bold">+{s.value}{s.suffix}</span></span>)}
                        </div>
                      </div>
                      <button onClick={() => sellItem(item)} disabled={isEquipped} className={`px-8 py-3 rounded-lg font-bold text-lg transition ${isEquipped ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-red-900/40 text-red-300 border border-red-800/50 hover:bg-red-800/60'}`}>卖出 {item.value}G</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'BAG' && (
          <div className="space-y-6 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h2 className="text-2xl mb-6 font-bold flex items-center"><i className="fas fa-shield-halved mr-2 text-blue-500"></i> 武装状态</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[player.equippedWeapon, player.equippedArmor].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-zinc-900 border border-zinc-700 min-h-[140px] shadow-inner">
                    <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-4">{idx === 0 ? '主手武器' : '身体防具'}</h4>
                    {item ? (
                      <div>
                        <div className={`font-bold text-xl quality-${item.quality}`}>{item.name}</div>
                        <div className="mt-3 space-y-2">
                          {item.stats.map((s, i) => <div key={i} className="text-sm text-zinc-300 flex justify-between"><span>{s.label}</span><span className="text-green-400 font-bold">+{s.value}{s.suffix}</span></div>)}
                        </div>
                      </div>
                    ) : <div className="text-zinc-700 text-lg italic mt-4">未装备</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h2 className="text-2xl mb-6 font-bold text-zinc-400 flex items-center"><i className="fas fa-box-open mr-2 text-zinc-500"></i> 行囊存货</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {player.inventory.map(item => {
                  const isEquipped = player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id;
                  return (
                    <div key={item.id} className={`bg-zinc-900 p-5 rounded-xl border flex flex-col hover:border-zinc-500 transition shadow-sm ${isEquipped ? 'border-blue-900/50' : 'border-zinc-800'}`}>
                      <div className={`font-bold text-lg mb-4 quality-${item.quality}`}>{item.name}</div>
                      <div className="flex-1 text-sm text-zinc-400 space-y-2">
                        {item.stats.map((s, i) => <div key={i} className="flex justify-between border-b border-zinc-800/50 pb-1"><span>{s.label}</span><span className="text-zinc-200">+{s.value}{s.suffix}</span></div>)}
                      </div>
                      <button onClick={() => equipItem(item)} disabled={isEquipped} className={`w-full py-3 mt-5 rounded-lg font-bold text-lg transition ${isEquipped ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-700 hover:bg-blue-600 text-white shadow-md shadow-blue-900/20'}`}>{isEquipped ? '装备中' : '穿戴装备'}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DUNGEON' && (
          <div className="h-full flex flex-col md:flex-row gap-4 relative overflow-hidden animate-fadeIn px-1">
            {!dungeon ? (
              <div className="flex-1 bg-zinc-800 p-8 md:p-12 rounded-2xl border border-zinc-700 text-center flex flex-col items-center justify-center shadow-lg my-2 mx-1 overflow-y-auto scrollbar-thin">
                <div className="relative mb-6">
                  <i className="fas fa-skull text-7xl text-red-600 animate-pulse"></i>
                </div>
                <h2 className="text-3xl font-black mb-2 italic tracking-widest text-zinc-100 uppercase">深渊遗迹</h2>
                
                <div className="mb-6 bg-zinc-900/50 px-6 py-2 rounded-full border border-zinc-700/50 inline-flex items-center gap-3">
                   <i className="fas fa-trophy text-yellow-500 text-sm"></i>
                   <span className="text-zinc-300 text-sm font-bold uppercase tracking-widest">记录: 第 <span className="text-yellow-500">{player.maxDungeonDepth}</span> 关</span>
                </div>

                {/* 起始起点选择 UI - 修改为切换按钮模式 */}
                {availableStartFloors.length > 1 && (
                  <div className="w-full max-w-sm mb-10 animate-fadeIn text-center">
                    <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
                      <div className="h-[1px] w-8 bg-zinc-700"></div>
                      选择远征起点
                      <div className="h-[1px] w-8 bg-zinc-700"></div>
                    </div>
                    
                    <div className="flex items-center justify-between bg-zinc-900/80 p-4 rounded-3xl border border-zinc-700 shadow-inner">
                      <button 
                        disabled={selectedStartFloor === 0}
                        onClick={() => changeStartFloor(-1)}
                        className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${selectedStartFloor === 0 ? 'text-zinc-800 cursor-not-allowed' : 'text-zinc-400 bg-zinc-800 hover:bg-zinc-700 active:scale-90'}`}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>

                      <div className="flex flex-col items-center px-4 animate-fadeIn" key={selectedStartFloor}>
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">
                          {selectedStartFloor === 0 ? '首层探索' : `深层 第 ${selectedStartFloor} 层`}
                        </span>
                        <div className="text-3xl font-black text-red-500 italic drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                          第 {selectedStartFloor === 0 ? '1' : selectedStartFloor * 10 + 1} 关
                        </div>
                      </div>

                      <button 
                        disabled={selectedStartFloor === availableStartFloors.length - 1}
                        onClick={() => changeStartFloor(1)}
                        className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${selectedStartFloor === availableStartFloors.length - 1 ? 'text-zinc-800 cursor-not-allowed' : 'text-zinc-400 bg-zinc-800 hover:bg-zinc-700 active:scale-90'}`}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-zinc-500 mb-8 max-w-xs leading-relaxed text-sm bg-zinc-900/30 p-4 rounded-xl border border-zinc-700/30">
                  阵亡将<span className="text-red-500 font-bold underline">永久摧毁已穿戴装备</span>。
                </div>
                
                <button onClick={startDungeon} className="w-full max-w-sm py-5 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black text-xl rounded-2xl shadow-xl transition transform hover:scale-105 active:scale-95 uppercase tracking-widest border-b-4 border-red-950">开启远征</button>
              </div>
            ) : (
              <>
                <div className="flex-[3] flex flex-col gap-3 min-w-0 overflow-hidden h-full">
                  <div className="flex-[6] flex flex-col gap-3 min-h-0">
                    <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-4 shadow-inner shrink-0">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">探险状态 (实时)</span>
                        <div className="flex items-center gap-2">
                           <span className="text-sm text-blue-400 font-mono font-bold tracking-tighter">生命: {dungeon.currentHP} / {dungeon.maxHP}</span>
                           <i className="fas fa-heart-pulse text-red-500/80 animate-pulse text-sm"></i>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
                         <div className="h-full bg-gradient-to-r from-blue-700 to-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-300" style={{ width: `${(dungeon.currentHP/dungeon.maxHP)*100}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-sm shrink-0">
                      <div className="flex justify-between text-sm font-black mb-2 text-zinc-400 tracking-widest uppercase">
                        <span className="flex items-center"><i className="fas fa-compass mr-2 text-red-500"></i> 第 {dungeon.depth} 关</span>
                        <span className={stepsToBoss <= 3 ? "text-red-500 animate-pulse" : "text-yellow-500"}>
                           {stepsToBoss === 0 ? '首领 已现身' : `距 首领: ${stepsToBoss}`}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700 relative">
                        <div className="h-full bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 bg-[length:200%_100%] animate-shimmer transition-all duration-700" style={{ width: `${bossProgress}%` }}></div>
                      </div>
                    </div>

                    <div className="flex-1 bg-zinc-900/40 rounded-2xl border border-zinc-700 relative overflow-hidden flex flex-col shadow-inner">
                      {dungeon.battle ? (
                        <div className="absolute inset-0 z-50 p-6 flex flex-col items-center justify-between animate-fadeIn bg-zinc-950/20 backdrop-blur-[2px]">
                          <div className="text-center w-full shrink-0">
                             <h3 className={`text-xl font-black mb-1 uppercase tracking-widest ${(dungeon.depth % 10 === 0) ? 'text-yellow-500' : 'text-red-500'}`}>
                                {dungeon.battle.monsterName}
                             </h3>
                          </div>
                          
                          <div className="flex-1 w-full flex justify-between items-center relative px-4">
                            <div className="absolute inset-0 pointer-events-none z-[60]">
                              {floatingTexts.map(ft => (
                                <div key={ft.id} className={`absolute font-black text-4xl italic transition-all duration-1200 transform animate-floatingText ${ft.type === 'damage' ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : ft.type === 'heal' ? 'text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'text-purple-400'}`} style={{ left: `calc(50% + ${ft.x}px)`, top: '45%' }}>
                                  {ft.text}
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-col items-center w-[44%]">
                              <div className="text-6xl text-blue-400 mb-3 drop-shadow-[0_0_10px_rgba(96,165,250,0.2)]"><i className="fas fa-user-shield"></i></div>
                              <div className="w-full space-y-2 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                                <div className="flex justify-between text-xs font-mono text-blue-300 px-1">
                                  <span className="font-bold">生命</span>
                                  <span>{dungeon.currentHP}/{dungeon.maxHP}</span>
                                </div>
                                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(dungeon.currentHP/dungeon.maxHP)*100}%` }}></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-3xl text-zinc-800 font-black italic">VS</div>
                            
                            <div className="flex flex-col items-center w-[44%]">
                              <div className={`text-6xl mb-3 ${dungeon.depth % 10 === 0 ? 'text-yellow-500 animate-bounce-short' : 'text-red-600'}`}><i className={`fas ${dungeon.depth % 10 === 0 ? 'fa-dragon' : 'fa-skull'}`}></i></div>
                              <div className="w-full space-y-2 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                                <div className="flex justify-between text-xs font-mono text-red-300 px-1">
                                  <span className="font-bold">敌方</span>
                                  <span>{dungeon.battle.monsterHP}/{dungeon.battle.monsterMaxHP}</span>
                                </div>
                                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(dungeon.battle.monsterHP/dungeon.battle.monsterMaxHP)*100}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="w-full py-2 flex justify-center shrink-0">
                            {!dungeon.battle.isFinished ? (
                               <button onClick={startBattle} disabled={(dungeon.battle as any).isStarted} className={`px-16 py-4 text-white font-black text-xl rounded-xl shadow-lg transition-all transform active:scale-95 uppercase border-b-4 ${(dungeon.battle as any).isStarted ? 'bg-zinc-700 border-zinc-900 opacity-50' : 'bg-red-800 border-red-950 hover:bg-red-700'}`}>
                                {(dungeon.battle as any).isStarted ? '厮杀中...' : '交战'}
                               </button>
                            ) : (
                              <div className="text-center animate-fadeIn py-2">
                                <div className={`text-3xl font-black mb-4 italic ${dungeon.battle.victory ? 'text-green-500' : 'text-red-600'}`}>
                                  {dungeon.battle.victory ? '斩获首级!' : '力尽而亡!'}
                                </div>
                                {dungeon.battle.victory ? (
                                   <button onClick={closeBattle} className="px-12 py-3 bg-zinc-800 text-white font-black rounded-lg border border-zinc-700 hover:bg-zinc-700 uppercase text-lg tracking-widest transition active:scale-95">扫荡</button>
                                ) : (
                                   <button onClick={handleDeath} className="px-12 py-3 bg-red-950 text-white font-black rounded-lg border border-red-800 uppercase text-lg tracking-widest transition active:scale-95">认命</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                           {dungeon.isDead ? (
                             <div className="animate-fadeIn">
                                <i className="fas fa-skull-crossbones text-7xl text-red-800 mb-6"></i>
                                <h3 className="text-2xl font-black text-red-600 mb-2">远征终结</h3>
                                <p className="text-zinc-500 text-sm mb-8">因果循环，神兵已陨。</p>
                                <button onClick={handleDeath} className="px-16 py-4 bg-red-950 text-white font-black rounded-xl border border-red-800 hover:bg-red-900 transition tracking-widest uppercase text-lg">重整旗鼓</button>
                             </div>
                           ) : (
                             <div className="flex flex-col items-center w-full px-6">
                                <div className="text-zinc-500 text-xs uppercase font-bold mb-2 tracking-widest opacity-60">遗迹深处</div>
                                <div className={`text-2xl font-black mb-10 ${dungeon.depth % 10 === 0 ? 'text-red-500 animate-pulse' : 'text-zinc-100'}`}>
                                  {dungeon.currentEvent}
                                </div>
                                
                                <button onClick={proceedDungeon} disabled={dungeon.isProcessing} className={`w-full max-sm py-12 rounded-2xl shadow-xl transition-all transform active:scale-95 border-b-8 flex flex-col items-center justify-center ${dungeon.isProcessing ? 'bg-zinc-700 border-zinc-900 opacity-50' : 'bg-red-800 border-red-950 hover:bg-red-700'}`}>
                                  <i className={`fas ${dungeon.isProcessing ? 'fa-spinner fa-spin' : 'fa-shoe-prints'} text-4xl mb-4`}></i>
                                  <span className="font-black tracking-widest text-2xl">{dungeon.isProcessing ? '寻觅中...' : '继续挺进'}</span>
                                </button>
                                
                                <button onClick={withdraw} disabled={dungeon.isProcessing} className="mt-10 text-yellow-600/60 hover:text-yellow-600 font-bold transition flex items-center gap-3 text-sm uppercase tracking-widest disabled:opacity-0 active:scale-95">
                                  <i className="fas fa-person-walking-dashed-line-arrow-right"></i> 撤出血地
                                </button>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-[4] bg-zinc-900/60 rounded-xl border border-zinc-800/80 p-4 flex flex-col min-h-0 shadow-lg relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-20"></div>
                    <h4 className="text-sm text-zinc-500 uppercase font-black mb-3 tracking-[0.2em] flex items-center shrink-0">
                      <span className="w-1.5 h-1.5 bg-red-800 rounded-full mr-2.5 shadow-[0_0_5px_rgba(153,27,27,0.8)]"></span> 冒险日志
                    </h4>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin text-sm font-sans italic">
                      {dungeon.log.map((l, i) => (
                        <div key={i} className={`animate-slideIn flex gap-3 ${i === 0 ? 'text-zinc-100 font-bold border-l-2 border-yellow-600/80 pl-3 py-1.5 bg-white/5 rounded-r-md' : 'text-zinc-500/80 pl-3'}`}>
                          <span className="opacity-20 font-mono text-xs mt-0.5">[{dungeon.log.length - i}]</span>
                          <span className="leading-relaxed">{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex flex-col gap-3 w-64 shrink-0 overflow-hidden h-full">
                   <div className="bg-zinc-800/80 rounded-xl border border-zinc-700 p-5 flex flex-col flex-1 overflow-hidden shadow-lg">
                      <h3 className="text-sm font-black mb-5 border-b border-zinc-700/50 pb-3 flex items-center text-zinc-400 uppercase tracking-widest">
                        <i className="fas fa-treasure-chest mr-2 text-yellow-600"></i> 本轮收益
                      </h3>
                      <div className="space-y-6 overflow-y-auto scrollbar-thin pr-1 flex-1">
                        <div className="p-4 bg-zinc-950/40 rounded-lg border border-zinc-900 shadow-inner group">
                          <div className="text-zinc-600 text-xs font-bold uppercase mb-0.5 tracking-tighter">累计金币</div>
                          <div className="text-yellow-500 font-black text-xl group-hover:scale-105 transition-transform origin-left">{dungeon.loot.gold} <span className="text-xs font-normal opacity-50">金</span></div>
                        </div>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-xs text-zinc-600 font-black uppercase px-1">
                              <span>掉落物品</span>
                              <span className="text-zinc-400 bg-zinc-700/50 px-2 py-0.5 rounded-md">{dungeon.loot.materials.length + dungeon.loot.inventory.length}</span>
                           </div>
                           <div className="grid gap-2">
                              {dungeon.loot.materials.map((m, i) => (
                                <div key={`m-${i}`} className={`text-xs px-3 py-2.5 rounded bg-zinc-950/20 border border-zinc-800/50 quality-${m.quality} font-bold truncate hover:bg-zinc-800/40 transition-colors shadow-sm`}>
                                  {m.name}
                                </div>
                              ))}
                              {dungeon.loot.inventory.map((item, i) => (
                                <div key={`i-${i}`} className={`text-xs px-3 py-2.5 rounded bg-zinc-900 border border-zinc-800 quality-${item.quality} font-bold flex justify-between gap-2 shadow-sm`}>
                                  <span className="truncate">{item.name}</span>
                                  <span className="opacity-30 text-[10px] uppercase font-mono">{item.type === 'WEAPON' ? '武' : '甲'}</span>
                                </div>
                              ))}
                              {dungeon.loot.materials.length === 0 && dungeon.loot.inventory.length === 0 && (
                                <div className="text-sm text-zinc-700 italic text-center py-12 opacity-40">等待掉落...</div>
                              )}
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 px-3 py-2 rounded-[1.8rem] shadow-2xl flex gap-2 z-[100] w-[92%] max-w-md shrink-0">
        <button onClick={() => setActiveTab('FORGE')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'FORGE' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-hammer text-xl mb-1"></i><span className="text-[11px] font-black tracking-widest uppercase">锻造</span>
        </button>
        <button onClick={() => setActiveTab('DUNGEON')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'DUNGEON' ? 'bg-red-700 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-skull text-xl mb-1"></i><span className="text-[11px] font-black tracking-widest uppercase">远征</span>
        </button>
        <button onClick={() => setActiveTab('SHOP')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'SHOP' ? 'bg-green-700 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-shopping-bag text-xl mb-1"></i><span className="text-[11px] font-black tracking-widest uppercase">交易</span>
        </button>
        <button onClick={() => setActiveTab('BAG')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'BAG' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-archive text-xl mb-1"></i><span className="text-[11px] font-black tracking-widest uppercase">行囊</span>
        </button>
      </nav>

      <style>{`
        @keyframes floatingText {
          0% { transform: translate(-50%, 0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(-50%, -100px); opacity: 0; }
        }
        .animate-floatingText {
          animation: floatingText 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 4s linear infinite;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .mask-fade-edges {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
        body {
          overflow: hidden;
          touch-action: manipulation;
        }
        main > div {
          scrollbar-gutter: stable;
        }
      `}</style>
    </div>
  );
};

export default App;
