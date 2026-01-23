
import React, { useRef, useEffect } from 'react';
import { Player, DungeonState, BlessingTier, Blessing } from '../../types';
import { DUNGEON_CONFIG } from '../../constants';
import { FloatingText, FloatingTextLayer } from '../Shared/FloatingTextLayer.tsx';

interface DungeonViewProps {
  player: Player;
  dungeon: DungeonState | null;
  isPrepMode: boolean;
  prepSupplies: number;
  prepBlessing: Blessing | null;
  selectedStartFloor: number;
  floatingTexts: FloatingText[];
  onOpenPrep: () => void;
  onClosePrep: () => void;
  onSetPrepSupplies: (v: number) => void;
  onPurchaseBlessing: (t: BlessingTier) => void;
  onPrevFloor: () => void;
  onNextFloor: () => void;
  onLaunchDungeon: () => void;
  onRepairItem: (type: 'WEAPON' | 'ARMOR') => void;
  onRepairAll: () => void;
  onProceedDungeon: () => void;
  onWithdraw: () => void;
  onStartBattle: () => void;
  onHandleDeath: () => void;
}

export const DungeonView: React.FC<DungeonViewProps> = ({
  player,
  dungeon,
  isPrepMode,
  prepSupplies,
  prepBlessing,
  selectedStartFloor,
  floatingTexts,
  onOpenPrep,
  onClosePrep,
  onSetPrepSupplies,
  onPurchaseBlessing,
  onPrevFloor,
  onNextFloor,
  onLaunchDungeon,
  onRepairItem,
  onRepairAll,
  onProceedDungeon,
  onWithdraw,
  onStartBattle,
  onHandleDeath
}) => {
    const dungeonLogRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (dungeonLogRef.current) {
            dungeonLogRef.current.scrollTop = 0; 
        }
    }, [dungeon?.log]);

    const currentFloorIndex = player.unlockedFloors.indexOf(selectedStartFloor);

    if (!dungeon) {
        return (
             <div className="h-full flex flex-col items-center justify-center animate-fadeIn bg-zinc-900 p-8 rounded-2xl border border-zinc-700 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
                 
                 {!isPrepMode ? (
                     <div className="z-10 text-center max-w-lg w-full flex flex-col h-full justify-center">
                         <div className="mb-auto mt-8"><i className="fas fa-dungeon text-8xl text-zinc-700 mb-6 block animate-pulse"></i><h2 className="text-5xl font-black text-white mb-4 uppercase tracking-widest">深渊远征</h2></div>
                         <button onClick={onOpenPrep} className="mb-auto w-full py-6 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black rounded-2xl text-3xl shadow-[0_0_40px_rgba(220,38,38,0.4)] transition transform active:scale-95 uppercase tracking-widest flex items-center justify-center gap-4 group"><span className="group-hover:translate-x-1 transition-transform">前往整备</span><i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i></button>
                     </div>
                 ) : (
                     <div className="z-10 w-full max-w-2xl bg-zinc-800/90 backdrop-blur rounded-3xl border border-zinc-600 shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                         <div className="p-6 border-b border-zinc-700 flex justify-between items-center bg-zinc-900"><h2 className="text-2xl font-black text-white uppercase tracking-widest"><i className="fas fa-clipboard-list mr-2"></i> 行前整备</h2><button onClick={onClosePrep} className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white"><i className="fas fa-times"></i></button></div>
                         
                         <div className="flex-1 overflow-y-auto p-6 space-y-6">
                             {/* Floor Selection */}
                             <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                                 <label className="text-sm font-bold text-zinc-500 uppercase mb-4 block">选择入口</label>
                                 <div className="flex items-center justify-between gap-4">
                                     <button onClick={onPrevFloor} disabled={currentFloorIndex <= 0} className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-700"><i className="fas fa-chevron-left"></i></button>
                                     <div className="text-center"><div className="text-4xl font-black text-white">第 {selectedStartFloor} 层</div><div className="text-xs text-red-400 font-bold mt-1">入场费: {selectedStartFloor === 1 ? 0 : selectedStartFloor * 10} G</div></div>
                                     <button onClick={onNextFloor} disabled={currentFloorIndex >= player.unlockedFloors.length - 1} className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 border border-zinc-700"><i className="fas fa-chevron-right"></i></button>
                                 </div>
                             </div>

                             {/* Repair Station */}
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
                                                <button onClick={() => onRepairItem('WEAPON')} disabled={player.equippedWeapon.currentDurability >= player.equippedWeapon.maxDurability} className="mt-2 text-xs bg-blue-900/50 text-blue-300 py-1.5 rounded disabled:opacity-30">修复</button>
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
                                                <button onClick={() => onRepairItem('ARMOR')} disabled={player.equippedArmor.currentDurability >= player.equippedArmor.maxDurability} className="mt-2 text-xs bg-blue-900/50 text-blue-300 py-1.5 rounded disabled:opacity-30">修复</button>
                                             </>
                                         ) : <div className="text-zinc-600 italic">未装备</div>}
                                     </div>
                                 </div>
                                 <button onClick={onRepairAll} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded-xl font-bold transition">一键全修</button>
                             </div>

                             {/* Supplies */}
                             <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                                 <div className="flex justify-between items-center mb-4"><div className="text-lg font-black text-white"><i className="fas fa-bread-slice text-orange-400 mr-2"></i>行军干粮</div><div className="text-orange-400 font-mono font-bold text-lg">{DUNGEON_CONFIG.SUPPLY_COST} G / 份</div></div>
                                 <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                     <input type="range" min="0" max="20" value={prepSupplies} onChange={e => onSetPrepSupplies(Number(e.target.value))} className="flex-1 accent-orange-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"/>
                                     <div className="w-16 text-center font-black text-3xl text-yellow-500">{prepSupplies}</div>
                                 </div>
                                 <div className="text-sm text-zinc-400 mt-3 text-right font-bold">小计: <span className="text-yellow-500 text-xl font-black">{prepSupplies * DUNGEON_CONFIG.SUPPLY_COST}</span> G</div>
                             </div>

                             {/* Blessings */}
                             <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700">
                                 <div className="text-lg font-black text-white mb-4"><i className="fas fa-pray text-purple-400 mr-2"></i>女神祝福 (可选)</div>
                                 <div className="grid grid-cols-3 gap-3">
                                     {[1, 2, 3].map(tier => (
                                         <button key={tier} onClick={() => onPurchaseBlessing(tier as BlessingTier)} disabled={false} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition relative overflow-hidden ${prepBlessing?.tier === tier ? 'bg-purple-900/50 border-purple-400' : 'bg-zinc-800 border-zinc-600 hover:border-zinc-500'}`}>
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
                             <button onClick={onLaunchDungeon} className="px-10 py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-2xl shadow-lg transition active:scale-95">出发</button>
                         </div>
                     </div>
                 )}
             </div>
        )
    }

    return (
        <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col animate-fadeIn">
        {/* Status Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex flex-col gap-3 shadow-lg shrink-0 z-20">
            {/* ... (Status Header Content unchanged) ... */}
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

            {/* PROGRESS BAR */}
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
                
                {/* --- FLOATING TEXT LAYER --- */}
                {/* Rendered inside this relative container so (0,0) is centered on the Battle/Event view */}
                <FloatingTextLayer texts={floatingTexts} />

                    {/* TOP LEFT STATUS OVERLAY */}
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

                            {!dungeon.battle.isStarted ? <button onClick={onStartBattle} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xl shadow-lg transition active:scale-95 uppercase tracking-widest border border-red-400/20">开始战斗</button> : dungeon.battle.isFinished ? <div className="flex gap-3">{dungeon.battle.victory ? <><button onClick={() => onProceedDungeon()} className="flex-[2] py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-xl shadow-lg transition active:scale-95 border border-green-400/20">继续探索 <i className="fas fa-arrow-right ml-2"></i></button><button onClick={onWithdraw} className="flex-1 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-xl text-lg shadow-lg transition active:scale-95 border border-yellow-400/20">撤退</button></> : <button onClick={onHandleDeath} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-red-500 font-black rounded-xl text-xl shadow-lg transition active:scale-95 border border-red-900/50">你被打败了...</button>}</div> : <div className="text-center text-zinc-400 font-bold animate-pulse text-lg py-2">战斗进行中...</div>}
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
                                        <button onClick={() => onProceedDungeon()} className="flex-[2] py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-2xl shadow-xl transition transform active:scale-95 tracking-widest uppercase border border-green-400/20">继续探索</button>
                                        <button onClick={onWithdraw} className="flex-1 py-5 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-2xl text-xl shadow-xl transition transform active:scale-95 border border-yellow-400/20">撤退</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Logs */}
                <div className="h-48 md:h-64 bg-black/60 border-t border-zinc-800 flex flex-col">
                    <div className="px-4 py-2 bg-zinc-900/80 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center border-b border-zinc-800"><span><i className="fas fa-scroll mr-1"></i> 冒险日志</span><span>FLOOR {dungeon.depth}</span></div>
                    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1.5 scrollbar-thin" ref={dungeonLogRef}>{dungeon.log.map((l, i) => <div key={i} className={`flex gap-2 ${i===0 ? 'text-white font-bold' : 'text-zinc-500'}`}><span className="opacity-50 select-none">&gt;</span><span>{l}</span></div>)}</div>
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
    );
};
