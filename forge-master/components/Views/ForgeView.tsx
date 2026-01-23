
import React, { useRef, useEffect } from 'react';
import { Player, ForgeSession, Material, Quality, EquipmentType } from '../../types';
import { FORGE_ACTIONS } from '../../constants';
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
  onFinishForge
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isTempering = forgeSession && forgeSession.progress >= 100;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [forgeSession?.logs]);

  const getSlotStatus = (index: number) => {
    const unlockLevel = [1, 2, 4][index];
    const isLocked = player.level < unlockLevel;
    return { isLocked, unlockLevel };
  };

  if (forgeSession) {
    return (
      <div className={`flex-1 bg-zinc-900 rounded-2xl border p-2 flex flex-col relative overflow-hidden transition-colors duration-700 ${forgeSession.status === 'FAILURE' ? 'border-red-600' : isTempering ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-zinc-700'}`}>
        
        {/* Render Floating Text Layer specifically for Forge */}
        <FloatingTextLayer texts={floatingTexts} />
        
        {forgeSession.status === 'FAILURE' && (
          <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center animate-fadeIn">
             <i className="fas fa-heart-broken text-9xl text-red-600 mb-6 animate-bounce"></i>
             <div className="text-5xl font-black text-red-500 uppercase tracking-widest">锻造失败</div>
             <div className="text-zinc-200 mt-4 text-2xl">材料已损毁</div>
          </div>
        )}
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] opacity-50 transition-all duration-1000 ${isTempering ? 'from-purple-900/40 via-zinc-900/80 to-zinc-950' : 'from-orange-900/20 via-zinc-900/50 to-zinc-950'}`}></div>
        
        {/* Score Header */}
        <div className="shrink-0 p-4 bg-zinc-800/80 rounded-xl border border-zinc-700/50 backdrop-blur-sm z-10 flex justify-between items-center mb-4">
          <div className="flex flex-col w-full text-center">
             <span className="text-lg text-zinc-200 uppercase font-black tracking-widest mb-1">{isTempering ? '打磨阶段' : '品质评分'}</span>
             <span className={`text-7xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all ${isTempering ? 'text-purple-400 scale-110' : 'text-zinc-100'}`}>{forgeSession.qualityScore}</span>
          </div>
        </div>

        {/* Forge Status Area */}
        <div className="flex-1 flex flex-col justify-center px-4 gap-8 z-10 relative">
           {forgeSession.activeDebuff && (
               <div className="absolute top-[-30px] left-0 right-0 flex justify-center animate-bounce">
                   <div className={`px-4 py-2 rounded-full font-black text-lg border-2 shadow-lg flex items-center gap-2 ${forgeSession.activeDebuff === 'HARDENED' ? 'bg-red-950/90 border-red-500 text-red-400' : 'bg-zinc-800/90 border-zinc-500 text-zinc-300'}`}>
                       <i className={`fas ${forgeSession.activeDebuff === 'HARDENED' ? 'fa-exclamation-triangle' : 'fa-cloud-meatball'}`}></i>
                       <span>{forgeSession.activeDebuff === 'HARDENED' ? '硬化状态：下次消耗翻倍' : '钝化状态：下次收益减半'}</span>
                   </div>
               </div>
           )}
           
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
        
        {/* Actions */}
        <div className="shrink-0 p-4 z-10 min-h-[160px] flex items-end">
           {!isTempering ? (
             <div className="grid grid-cols-3 gap-3 w-full">
                <button onClick={() => onForgeAction('LIGHT')} disabled={forgeSession.status !== 'ACTIVE'} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-2xl p-2 flex flex-col items-center justify-center active:scale-95 transition group h-36 relative shadow-lg">
                   <div className="flex items-center justify-center gap-2 mb-2 w-full"><i className="fas fa-hammer text-blue-400 text-2xl group-hover:-rotate-12 transition-transform"></i><span className="font-black text-xl text-white whitespace-nowrap">轻击</span></div>
                   <div className="text-center w-full flex flex-col justify-center gap-1"><div className="text-sm font-bold text-zinc-300 leading-tight">消耗 {Math.max(1, Math.floor(FORGE_ACTIONS.LIGHT.baseCost * (1 - forgeSession.costModifier)))} 耐久</div><div className="text-xs text-zinc-500 scale-90 origin-center whitespace-nowrap">稳定提升进度</div></div>
                </button>
                <button onClick={() => onForgeAction('HEAVY')} disabled={forgeSession.status !== 'ACTIVE'} className="bg-zinc-800 hover:bg-zinc-700 border border-orange-900/50 rounded-2xl p-2 flex flex-col items-center justify-center active:scale-95 transition group relative overflow-hidden h-36 shadow-lg">
                   <div className="absolute inset-0 bg-orange-900/10 group-hover:bg-orange-900/20 transition-colors"></div>
                   <div className="flex items-center justify-center gap-2 mb-2 z-10 w-full"><i className="fas fa-gavel text-orange-500 text-2xl group-hover:scale-110 transition-transform"></i><span className="font-black text-xl text-orange-100 whitespace-nowrap">重锤</span></div>
                   <div className="text-center z-10 w-full flex flex-col justify-center gap-1"><div className="text-sm font-bold text-orange-300 leading-tight">消耗 {Math.max(1, Math.floor(FORGE_ACTIONS.HEAVY.baseCost * (1 - forgeSession.costModifier)))} 耐久</div><div className="text-xs text-orange-400/80 scale-90 origin-center whitespace-nowrap">大幅增分 + 积攒重势</div></div>
                </button>
                <button onClick={() => onForgeAction('QUENCH')} disabled={forgeSession.status !== 'ACTIVE' || forgeSession.quenchCooldown > 0} className={`bg-zinc-800 border border-zinc-600 rounded-2xl p-2 flex flex-col items-center justify-center transition relative h-36 shadow-lg ${forgeSession.quenchCooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700 active:scale-95'}`}>
                   {forgeSession.quenchCooldown > 0 && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl font-black text-3xl text-white z-20">{forgeSession.quenchCooldown}</div>}
                   <div className="flex items-center justify-center gap-2 mb-2 w-full"><i className="fas fa-fire text-cyan-400 text-2xl animate-pulse"></i><span className="font-black text-xl text-white whitespace-nowrap">淬火</span></div>
                   <div className="text-center w-full flex flex-col justify-center gap-1"><div className="text-sm font-bold text-green-400 leading-tight">恢复30%耐久</div><div className="text-xs text-zinc-500 scale-90 origin-center whitespace-nowrap text-red-400/80">可能伴随负面效果</div></div>
                </button>
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-6 w-full">
                <button onClick={onFinishForge} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-800 to-green-600 hover:from-green-700 hover:to-green-500 rounded-2xl border-2 border-green-400 shadow-lg active:scale-95 transition h-40">
                   <div className="text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-3"><i className="fas fa-check-circle"></i>完成</div>
                   <div className="text-base text-green-100 font-bold">保留当前品质</div>
                </button>
                <button onClick={() => onForgeAction('POLISH')} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-900 to-purple-700 hover:from-purple-800 hover:to-purple-600 rounded-2xl border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition relative overflow-hidden group h-40">
                   <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.1),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                   <div className="text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-3"><i className="fas fa-gem animate-pulse"></i>打磨</div>
                   <div className="text-sm text-purple-200 font-bold">消耗重势爆发</div>
                   <div className="text-xs text-purple-300 mt-1">{forgeSession.polishCount === 0 ? '当前效率 100%' : forgeSession.polishCount === 1 ? '效率降至 80% (消耗1.5x)' : '效率降至 50% (消耗2x)'}</div>
                </button>
             </div>
           )}
        </div>
        
        {/* Logs */}
        <div className="h-28 bg-black/40 p-4 overflow-y-auto text-base font-mono space-y-1.5 border-t border-zinc-800 z-10 shrink-0">
          {forgeSession.logs.map((log, i) => <div key={i} className={`opacity-90 ${i === 0 ? 'text-white font-bold' : 'text-zinc-400'}`}>{i === 0 ? '> ' : ''}{log}</div>)}
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  }

  // Pre-Forge UI (Existing code remains similar)
  return (
    <div className="flex-col flex h-full gap-4">
       {/* (Keep existing Pre-Forge UI code as it was, no changes needed for FloatingText there) */}
       <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 flex flex-col items-center relative overflow-hidden shrink-0 shadow-lg">
        <h2 className="text-3xl mb-6 font-black flex items-center justify-center text-zinc-200 uppercase tracking-widest"><i className="fas fa-fire-alt mr-2 text-orange-500"></i> 锻造台</h2>
        <div className="flex gap-6 mb-8 bg-zinc-900/50 p-2 rounded-xl">
          <button onClick={() => onSetForgeType('WEAPON')} className={`px-10 py-4 rounded-lg text-xl font-bold transition ${forgeType === 'WEAPON' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>武器</button>
          <button onClick={() => onSetForgeType('ARMOR')} className={`px-10 py-4 rounded-lg text-xl font-bold transition ${forgeType === 'ARMOR' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>防具</button>
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
