
import React, { useRef, useEffect, useState } from 'react';
import { Player, ForgeSession, Material, Quality, EquipmentType } from '../../types';
import { FORGE_ACTIONS, HEAT_CONFIG } from '../../constants';
import { getForgeActionCost } from '../../services/gameLogic';
import { FloatingText, FloatingTextLayer } from '../Shared/FloatingTextLayer';

interface ForgeViewProps {
  player: Player;
  forgeSession: ForgeSession | null;
  forgeSlots: (Material | null)[];
  forgeType: EquipmentType;
  forgePreview: { durability: number, costRed: number, scoreMult: number };
  groupedMaterials: { mat: Material, count: number, instances: Material[] }[];
  floatingTexts: FloatingText[];
  onSetForgeType: (t: EquipmentType) => void;
  onAddSlot: (mat: Material, idx: number) => void;
  onRemoveSlot: (idx: number) => void;
  onStartForge: () => void;
  onForgeAction: (action: 'LIGHT' | 'HEAVY' | 'QUENCH' | 'POLISH') => void;
  onFinishForge: () => void;
  onMarkTutorialSeen: () => void;
}

export const ForgeView: React.FC<ForgeViewProps> = ({
  player,
  forgeSession,
  forgeSlots,
  forgeType,
  forgePreview,
  groupedMaterials,
  floatingTexts,
  onSetForgeType,
  onAddSlot,
  onRemoveSlot,
  onStartForge,
  onForgeAction,
  onFinishForge,
  onMarkTutorialSeen
}) => {
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const isTempering = forgeSession && forgeSession.progress >= 100;
  
  // State for visual effects
  const [scoreDelta, setScoreDelta] = useState<{ val: number, id: number } | null>(null);
  const [prevScore, setPrevScore] = useState(0);
  const [hitEffect, setHitEffect] = useState(false);

  // Fix log scrolling: always scroll to top as new logs are prepended
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  }, [forgeSession?.logs]);

  // Handle Score Updates & Hit Effects
  useEffect(() => {
      if (forgeSession) {
          if (forgeSession.qualityScore !== prevScore) {
              const diff = forgeSession.qualityScore - prevScore;
              if (diff !== 0) {
                  setScoreDelta({ val: diff, id: Date.now() });
                  setHitEffect(true);
                  setTimeout(() => setHitEffect(false), 150); // Reset hit effect
              }
              setPrevScore(forgeSession.qualityScore);
          }
      } else {
          setPrevScore(0);
          setScoreDelta(null);
      }
  }, [forgeSession?.qualityScore]);

  const getSlotStatus = (index: number) => {
    const unlockLevel = [1, 2, 4][index];
    const isLocked = player.level < unlockLevel;
    return { isLocked, unlockLevel };
  };

  if (forgeSession) {
      const tempPercent = forgeSession.temperature;
      let zoneName = '低温';
      let zoneColor = 'text-blue-400';
      const isOverheat = tempPercent >= HEAT_CONFIG.OVERHEAT_START;

      if (isOverheat) {
          zoneName = '过热 (高耗高收益)';
          zoneColor = 'text-red-500 animate-pulse';
      } else if (tempPercent >= HEAT_CONFIG.OPTIMAL_START) {
          zoneName = '最佳 (高收益)';
          zoneColor = 'text-green-400';
      }

      const durabilityRatio = forgeSession.currentDurability / forgeSession.maxDurability;

      // Polish Risk Logic
      const polishMaxCost = 10 + (forgeSession.polishCount * 5);
      const polishRisk = polishMaxCost >= forgeSession.currentDurability;
      const riskColor = polishRisk ? 'text-red-500' : 'text-green-500';

      // Polish Expected Score Calculation
      const baseScore = FORGE_ACTIONS.POLISH.baseScore || 150;
      const scoreGrowth = FORGE_ACTIONS.POLISH.scoreGrowth || 50;
      const expectedScore = baseScore + (forgeSession.polishCount * scoreGrowth);

      // Costs
      const lightCost = getForgeActionCost(forgeSession, 'LIGHT');
      const heavyCost = getForgeActionCost(forgeSession, 'HEAVY');

      return (
      <div className={`flex-1 bg-zinc-900 rounded-2xl border p-2 flex flex-col relative overflow-hidden transition-colors duration-700 ${forgeSession.status === 'FAILURE' ? 'border-red-600' : isTempering ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-zinc-700'}`}>
        
        <FloatingTextLayer texts={floatingTexts} />
        
        {forgeSession.status === 'FAILURE' && (
          <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center animate-fadeIn">
             <i className="fas fa-heart-broken text-9xl text-red-600 mb-6 animate-bounce"></i>
             <div className="text-5xl font-black text-red-500 uppercase tracking-widest">装备碎裂</div>
             <div className="text-zinc-200 mt-4 text-2xl">耐力耗尽</div>
          </div>
        )}
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] opacity-50 transition-all duration-1000 ${isTempering ? 'from-purple-900/40 via-zinc-900/80 to-zinc-950' : 'from-orange-900/20 via-zinc-900/50 to-zinc-950'}`}></div>
        
        {/* Score Header */}
        <div className={`shrink-0 p-4 bg-zinc-800/80 rounded-xl border border-zinc-700/50 backdrop-blur-sm z-10 flex justify-between items-center mb-4 transition-transform duration-100 relative ${hitEffect ? 'scale-[1.02] border-yellow-500/50' : ''}`}>
          
          <div className="absolute top-2 left-4 flex flex-col items-start opacity-70">
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">最高记录</div>
              <div className="text-yellow-500 font-mono font-black text-4xl leading-none drop-shadow-md">{player.maxScore}</div>
          </div>

          <div className="flex flex-col w-full text-center relative">
             <span className="text-lg text-zinc-200 uppercase font-black tracking-widest mb-1">{isTempering ? '打磨阶段' : '品质评分'}</span>
             <div className="flex items-center justify-center gap-2">
                 <span className={`text-7xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all ${isTempering ? 'text-purple-400' : 'text-yellow-400'} ${hitEffect ? 'scale-110 text-yellow-300' : ''}`}>
                     {forgeSession.qualityScore}
                 </span>
                 {scoreDelta && (
                     <span key={scoreDelta.id} className="text-4xl font-black text-amber-300 animate-floatUp absolute left-[65%] top-2">
                         +{scoreDelta.val}
                     </span>
                 )}
             </div>
          </div>
        </div>

        {/* Status Dashboard */}
        <div className="flex-1 flex flex-col justify-start px-4 gap-4 z-10 relative">
           
           {/* BAR: DURABILITY (Forge) OR RISK BAR (Polish) */}
           {isTempering ? (
               <div className={`animate-fadeIn ${polishRisk ? 'animate-shake' : ''}`}>
                  <div className="flex justify-between text-lg font-bold mb-1 uppercase tracking-wider text-red-400">
                    <span className="flex items-center gap-2"><i className="fas fa-heart mr-2"></i>当前耐久</span>
                    <span>{forgeSession.currentDurability} / {forgeSession.maxDurability}</span>
                  </div>
                  
                  {/* Polish Progress Bar */}
                  <div className={`h-6 bg-zinc-950 rounded-full overflow-hidden border shadow-inner mb-2 ${polishRisk ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'border-zinc-700'}`}>
                     <div className={`h-full transition-all duration-300 ${polishRisk ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-red-800 to-red-600'}`} style={{ width: `${Math.max(0, durabilityRatio * 100)}%` }}></div>
                  </div>

                  <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wider text-zinc-400 bg-black/30 p-2 rounded">
                    <span>下轮消耗区间</span>
                    <span className={riskColor}>0 ~ {polishMaxCost}</span>
                  </div>
                  
                  {polishRisk && (
                      <div className="text-center bg-red-900/80 text-white font-black text-sm py-2 rounded animate-pulse border border-red-500 mt-1">
                          <i className="fas fa-exclamation-triangle mr-2"></i> 警告：存在碎裂风险！
                      </div>
                  )}
               </div>
           ) : (
               <div>
                  <div className="flex justify-between text-lg font-bold mb-1 uppercase tracking-wider text-red-400">
                    <span><i className="fas fa-heart mr-2"></i>耐力</span>
                    <span>{forgeSession.currentDurability} / {forgeSession.maxDurability}</span>
                  </div>
                  <div className="h-6 bg-zinc-950 rounded-full overflow-hidden border border-zinc-700 shadow-inner">
                     <div className={`h-full transition-all duration-300 ${forgeSession.currentDurability < 10 ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-red-800 to-red-600'}`} style={{ width: `${Math.max(0, durabilityRatio * 100)}%` }}></div>
                  </div>
               </div>
           )}

           {/* Temperature Gauge (Only show during Forge) */}
           {!isTempering && (
               <div>
                   <div className="flex justify-between text-lg font-bold mb-1 uppercase tracking-wider">
                       <span className={zoneColor}><i className="fas fa-thermometer-half mr-2"></i>{zoneName}</span>
                       <span className={zoneColor}>{forgeSession.temperature}°C</span>
                   </div>
                   <div className="h-6 bg-zinc-950 rounded-full overflow-hidden border border-zinc-700 shadow-inner relative flex">
                       {/* Visual Zones */}
                       <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-white/20 z-10"></div> {/* 30 Start */}
                       <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-red-500/50 z-10"></div> {/* 80 Overheat */}
                       
                       <div className="h-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-600 transition-all duration-500" style={{width: `${forgeSession.temperature}%`}}></div>
                   </div>
                   <div className="flex justify-between text-xs font-bold text-zinc-500 mt-1 px-1">
                       <span>低温(x0.8)</span>
                       <span>最佳(x1.5)</span>
                       <span>过热(x2.5 / 耗耐x2)</span>
                   </div>
               </div>
           )}

           {/* Focus & Progress */}
           <div className="flex gap-4 items-center mt-2">
               <div className="flex-1">
                  <div className="flex justify-between text-sm font-bold mb-1 text-green-400 uppercase tracking-wider">
                      <span>锻造进度</span>
                      <span>{Math.min(100, forgeSession.progress)}%</span>
                  </div>
                  <div className="h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-700">
                      <div className="h-full bg-green-500 transition-all duration-300 relative" style={{ width: `${Math.min(100, forgeSession.progress)}%` }}>
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_5px_white]"></div>
                      </div>
                  </div>
               </div>
               
               {/* Focus Stacks */}
               {!isTempering && (
                   <div className="flex flex-col items-center justify-center bg-zinc-800 p-2 rounded-xl border border-zinc-700 min-w-[5rem] shrink-0">
                       <div className="text-[10px] text-zinc-400 font-bold uppercase mb-1">专注 ({forgeSession.maxFocus})</div>
                       <div className="flex gap-1 h-6 items-end">
                           {Array.from({length: forgeSession.maxFocus}).map((_, i) => (
                               <div key={i} className={`w-3 rounded-sm transition-all duration-300 border border-black/20 ${i < forgeSession.focus ? 'h-full bg-yellow-400 shadow-[0_0_8px_gold]' : 'h-1.5 bg-zinc-700'}`}></div>
                           ))}
                       </div>
                   </div>
               )}
           </div>

        </div>
        
        {/* Actions */}
        <div className="shrink-0 p-4 z-10 min-h-[170px] flex items-end">
           {!isTempering ? (
             <div className="grid grid-cols-3 gap-3 w-full">
                {/* Light */}
                <button onClick={() => onForgeAction('LIGHT')} disabled={forgeSession.status !== 'ACTIVE'} className={`bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-2xl p-2 flex flex-col items-center justify-center active:scale-90 active:brightness-125 transition group h-36 relative shadow-lg active:border-green-400 duration-100 overflow-hidden ${forgeSession.comboActive ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)] animate-pulse' : ''}`}>
                   <div className="flex items-center justify-center gap-2 mb-1 w-full relative z-10"><i className="fas fa-hammer text-blue-400 text-2xl group-hover:-rotate-12 transition-transform"></i><span className="font-black text-xl text-white whitespace-nowrap">轻击</span></div>
                   <div className="text-center w-full flex flex-col justify-center gap-0.5 relative z-10">
                       {forgeSession.comboActive ? (
                           <>
                             <div className="text-xs font-black text-green-300 bg-green-900/50 px-1 py-0.5 rounded">免耗 / 双倍专注!</div>
                             <div className="text-[10px] text-zinc-300 mt-1">消耗 0 耐久</div>
                           </>
                       ) : (
                           <>
                             <div className="text-sm font-bold text-green-400">专注 +1</div>
                             <div className="flex items-baseline justify-center gap-1 mt-1 text-zinc-400 text-[10px] font-bold">
                                <span>消耗</span>
                                <span className="text-red-500 text-2xl font-black">{lightCost}</span>
                                <span>耐久</span>
                             </div>
                           </>
                       )}
                   </div>
                   {/* Background Shine for Combo */}
                   {forgeSession.comboActive && <div className="absolute inset-0 bg-green-500/10 z-0"></div>}
                </button>

                {/* Heavy */}
                <button onClick={() => onForgeAction('HEAVY')} disabled={forgeSession.status !== 'ACTIVE'} className="bg-zinc-800 hover:bg-zinc-700 border border-orange-900/50 rounded-2xl p-2 flex flex-col items-center justify-center active:scale-90 active:brightness-125 transition group relative overflow-hidden h-36 shadow-lg active:border-orange-500 duration-100">
                   <div className={`absolute inset-0 bg-orange-900/10 transition-colors ${forgeSession.focus > 0 ? 'bg-orange-500/20 animate-pulse' : ''}`}></div>
                   <div className="flex items-center justify-center gap-2 mb-1 z-10 w-full"><i className="fas fa-gavel text-orange-500 text-2xl group-hover:scale-110 transition-transform"></i><span className="font-black text-xl text-orange-100 whitespace-nowrap">重锤</span></div>
                   <div className="text-center z-10 w-full flex flex-col justify-center gap-0.5">
                       <div className="text-xs font-bold text-orange-300">{forgeSession.focus > 0 ? '消耗所有专注' : '需专注提升威力'}</div>
                       <div className={`text-sm font-black ${forgeSession.focus > 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                           倍率: x{(1 + forgeSession.focus * 0.5).toFixed(1)}
                       </div>
                       <div className="flex items-baseline justify-center gap-1 mt-1 text-zinc-400 text-[10px] font-bold">
                          <span>消耗</span>
                          <span className={`text-red-500 font-black transition-all ${isOverheat ? 'text-4xl drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 'text-2xl'}`}>{heavyCost}</span>
                          <span>耐久</span>
                       </div>
                   </div>
                </button>

                {/* Quench */}
                <button onClick={() => onForgeAction('QUENCH')} disabled={forgeSession.status !== 'ACTIVE'} className={`bg-zinc-800 border border-zinc-600 rounded-2xl p-2 flex flex-col items-center justify-center transition relative h-36 shadow-lg hover:bg-zinc-700 active:scale-90 active:brightness-125 active:border-cyan-400 duration-100`}>
                   <div className="flex items-center justify-center gap-2 mb-1 w-full"><i className="fas fa-snowflake text-cyan-400 text-2xl animate-pulse"></i><span className="font-black text-xl text-white whitespace-nowrap">淬火</span></div>
                   <div className="text-center w-full flex flex-col justify-center gap-0.5">
                       <div className="text-sm font-bold text-cyan-300">温度 -35</div>
                       <div className="text-[10px] text-green-400 mt-1 font-bold">耐久 +20</div>
                   </div>
                </button>
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-6 w-full items-end">
                <button onClick={onFinishForge} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-800 to-green-600 hover:from-green-700 hover:to-green-500 rounded-2xl border-2 border-green-400 shadow-lg active:scale-95 transition h-40">
                   <div className="text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-3"><i className="fas fa-check-circle"></i>完成</div>
                   <div className="text-base text-green-100 font-bold">见好就收</div>
                </button>
                
                <div className="relative">
                    <div className="text-center mb-2 animate-bounce">
                        <span className="text-3xl font-black text-yellow-300 drop-shadow-md">+{expectedScore}</span>
                        <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider">预期收益</div>
                    </div>
                    <button onClick={() => onForgeAction('POLISH')} className={`w-full flex flex-col items-center justify-center p-6 rounded-2xl border-2 shadow-lg active:scale-95 transition relative overflow-hidden group h-40 bg-gradient-to-br from-yellow-700 via-purple-900 to-red-900 border-yellow-500 hover:border-yellow-300 ${polishRisk ? 'animate-pulse border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'shadow-[0_0_20px_rgba(234,179,8,0.4)]'}`}>
                    {/* Gradient Shimmer Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.2),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    
                    <div className="text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-3 relative z-10"><i className="fas fa-gem animate-bounce text-yellow-300"></i>打磨</div>
                    
                    {polishRisk ? (
                            <div className="absolute bottom-4 left-0 right-0 text-center">
                                <span className="text-[10px] text-white bg-red-600 px-2 py-0.5 rounded font-black animate-bounce shadow-sm uppercase tracking-wider">
                                    <i className="fas fa-skull mr-1"></i> 碎裂风险
                                </span>
                            </div>
                    ) : (
                            <div className="text-xs text-zinc-300 mt-1 relative z-10">搏一搏，单车变摩托</div>
                    )}
                    </button>
                </div>
             </div>
           )}
        </div>
        
        {/* Logs - Updated to ensure scroll to top for newest logs */}
        <div className="h-28 bg-black/40 p-4 overflow-y-auto text-base font-mono space-y-1.5 border-t border-zinc-800 z-10 shrink-0" ref={logsContainerRef}>
          {forgeSession.logs.map((log, i) => <div key={i} className={`opacity-90 ${i === 0 ? 'text-white font-bold' : 'text-zinc-400'}`}>{i === 0 ? '> ' : ''}{log}</div>)}
        </div>
      </div>
    );
  }

  // Pre-Forge UI (Existing code remains similar)
  return (
    <div className="flex-col flex h-full gap-4 relative">
        
       {/* Tutorial Overlay */}
       {!player.hasSeenForgeTutorial && (
            <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-fadeIn rounded-2xl overflow-y-auto">
                <h2 className="text-4xl font-black text-yellow-500 mb-6 uppercase tracking-widest border-b-4 border-yellow-600 pb-2 shrink-0">锻造指南</h2>
                
                <div className="flex-1 w-full max-w-5xl flex flex-col gap-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-700 text-left">
                            <h3 className="text-xl font-bold text-white mb-2"><i className="fas fa-bullseye text-red-500 mr-2"></i>核心目标</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">利用有限的<span className="text-red-400 font-bold">耐久度</span>，通过操作控制<span className="text-orange-400 font-bold">温度</span>，尽可能堆高<span className="text-yellow-400 font-bold">品质评分</span>。评分决定装备的属性和售价。</p>
                        </div>
                        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-700 text-left">
                            <h3 className="text-xl font-bold text-white mb-2"><i className="fas fa-hammer text-blue-400 mr-2"></i>操作技巧</h3>
                            <ul className="text-zinc-400 text-sm space-y-2">
                                <li><span className="font-bold text-white">轻击</span>：积攒【专注】，微量升温。</li>
                                <li><span className="font-bold text-white">重锤</span>：消耗【专注】大幅得分，大量升温。</li>
                                <li><span className="font-bold text-white">淬火</span>：降温并<span className="text-green-400 font-bold">恢复耐久</span>。</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-700 text-left">
                        <h3 className="text-xl font-bold text-white mb-2"><i className="fas fa-temperature-high text-orange-500 mr-2"></i>温度控制</h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-blue-900/20 p-2 rounded border border-blue-900/50"><div className="text-blue-400 font-bold">低温区</div><div className="text-xs text-zinc-500">收益 x0.8</div></div>
                            <div className="bg-green-900/20 p-2 rounded border border-green-900/50"><div className="text-green-400 font-bold">最佳区</div><div className="text-xs text-zinc-500">收益 x1.5</div></div>
                            <div className="bg-red-900/20 p-2 rounded border border-red-900/50"><div className="text-red-500 font-bold animate-pulse">过热区</div><div className="text-xs text-zinc-500">耗耐翻倍 / 收益 x2.5</div></div>
                        </div>
                    </div>

                    <div className="bg-red-950/30 p-6 rounded-2xl border-2 border-red-600 text-left flex items-start gap-4 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                        <div className="text-4xl text-red-500 mt-1"><i className="fas fa-skull-crossbones animate-pulse"></i></div>
                        <div>
                            <h3 className="text-2xl font-black text-red-500 mb-1 uppercase tracking-widest">致命警告</h3>
                            <p className="text-red-200 font-bold text-lg">
                                一旦<span className="text-white border-b-2 border-red-500 mx-1">耐久度归零</span>，装备将直接<span className="text-4xl font-black text-white mx-1 align-bottom" style={{textShadow: '0 0 10px red'}}>碎裂</span>！
                            </p>
                            <p className="text-red-400/70 text-sm mt-1">碎裂意味着本次锻造彻底失败，材料与成品全部消失。</p>
                        </div>
                    </div>
                </div>

                <button onClick={onMarkTutorialSeen} className="px-16 py-5 bg-yellow-600 hover:bg-yellow-500 text-white font-black text-2xl rounded-2xl shadow-xl transition active:scale-95 uppercase tracking-widest animate-bounce border-b-4 border-yellow-800 shrink-0">
                    我明白了
                </button>
            </div>
       )}

       <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 flex flex-col items-center relative overflow-hidden shrink-0 shadow-lg">
        
        <div className="absolute top-2 left-4 flex flex-col items-start opacity-70">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">最高记录</div>
            <div className="text-yellow-500 font-mono font-black text-4xl leading-none drop-shadow-md">{player.maxScore}</div>
        </div>

        <h2 className="text-3xl mb-6 font-black flex items-center justify-center text-zinc-200 uppercase tracking-widest"><i className="fas fa-fire-alt mr-2 text-orange-500"></i> 锻造台</h2>
        <div className="flex gap-6 mb-8 bg-zinc-900/50 p-2 rounded-xl w-full max-w-lg">
          <button onClick={() => onSetForgeType('WEAPON')} className={`px-10 py-4 flex-1 rounded-xl text-xl font-black transition uppercase tracking-widest border-2 ${forgeType === 'WEAPON' ? 'bg-red-900/50 text-red-100 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'}`}>
              <i className="fas fa-khanda mr-2"></i>武器
          </button>
          <button onClick={() => onSetForgeType('ARMOR')} className={`px-10 py-4 flex-1 rounded-xl text-xl font-black transition uppercase tracking-widest border-2 ${forgeType === 'ARMOR' ? 'bg-blue-900/50 text-blue-100 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'}`}>
              <i className="fas fa-shield-alt mr-2"></i>防具
          </button>
        </div>
        <div className="flex justify-center items-center gap-6 mb-8 w-full px-4">
          {forgeSlots.map((slot, i) => {
            const { isLocked, unlockLevel } = getSlotStatus(i);
            return (
              <div key={i} onClick={() => !isLocked && onRemoveSlot(i)} className={`w-32 h-40 rounded-2xl border-2 flex flex-col items-center justify-center transition relative group ${isLocked ? 'border-zinc-800 bg-zinc-900 cursor-not-allowed opacity-60' : slot ? 'border-zinc-500 bg-zinc-800 cursor-pointer border-dashed' : 'border-zinc-700 border-dashed hover:border-zinc-500 cursor-pointer'}`}>
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
        <button disabled={forgeSlots.filter(s => s !== null).length === 0} onClick={onStartForge} className={`w-full py-6 text-white font-black text-3xl rounded-2xl shadow-xl active:scale-95 transition tracking-widest bg-gradient-to-r from-orange-700 to-red-700 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:grayscale`}>开始锻造</button>
      </div>
       <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 flex-1 min-h-0 flex flex-col">
        <h3 className="text-lg font-black text-zinc-300 mb-4 uppercase tracking-widest flex items-center shrink-0"><i className="fas fa-cubes mr-2"></i> 材料仓库</h3>
        <div className="grid grid-cols-3 gap-3 overflow-y-auto scrollbar-thin content-start p-1">
          {groupedMaterials.length === 0 && <div className="col-span-3 text-zinc-400 text-lg py-12 italic text-center">空空如也...去商店买点吧</div>}
          {groupedMaterials.map(({ mat, count, instances }) => (
            <button key={`${mat.name}_${mat.quality}`} onClick={() => { const emptyIndex = forgeSlots.findIndex((s, i) => s === null && !getSlotStatus(i).isLocked); if (emptyIndex !== -1 && instances.length > 0) onAddSlot(instances[0], emptyIndex); }} className={`p-4 rounded-xl border bg-zinc-900 flex flex-col items-center justify-center min-h-[160px] hover:bg-zinc-800 transition active:scale-95 relative group shadow-md ${mat.quality === Quality.Rare ? 'border-yellow-900/50' : mat.quality === Quality.Refined ? 'border-green-900/50' : 'border-zinc-700'}`}>
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
  );
};
