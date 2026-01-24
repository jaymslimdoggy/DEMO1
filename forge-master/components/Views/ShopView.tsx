
import React from 'react';
import { Player, Quality, Equipment } from '../../types';
import { MATERIALS } from '../../constants';

interface ShopViewProps {
  player: Player;
  onBuyMaterial: (mat: any, slotIndex?: number) => void;
  onSellItem: (item: Equipment) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ player, onBuyMaterial, onSellItem }) => {
  const getMaterialUnlockLevel = (quality: Quality) => {
    if (quality === Quality.Common) return 1;
    if (quality === Quality.Refined) return 2;
    if (quality === Quality.Rare) return 3;
    return 1;
  };

  const renderMaterialCard = (mat: any, isLocked: boolean, unlockLevel: number, isLimited: boolean = false, isSoldOut: boolean = false, slotIndex: number = -1) => {
      return (
        <div key={isLimited ? `limited-${slotIndex}` : mat.id} className={`bg-zinc-900 p-4 rounded-xl border flex flex-col items-center text-center shadow-lg relative overflow-hidden group ${isLocked || isSoldOut ? 'border-zinc-800 opacity-70 grayscale' : 'border-zinc-800'}`}>
            <div className={`absolute top-0 left-0 w-1.5 quality-${mat.quality} bg-current opacity-80`}></div>
            {isLimited && <div className="absolute top-2 right-2 text-purple-500 text-[10px] font-black uppercase border border-purple-500/30 px-1.5 py-0.5 rounded bg-purple-900/20">限购</div>}
            {isSoldOut && <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center"><span className="text-red-500 font-black text-xl -rotate-12 border-4 border-red-500 px-2 py-1 rounded-xl">售罄</span></div>}
            
            <div className="flex flex-col items-center mb-3 w-full">
                <div className={`w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center text-3xl quality-${mat.quality} mb-2 border border-zinc-800/50`}>{isLocked ? <i className="fas fa-lock text-zinc-600"></i> : <i className={`fas ${mat.isDungeonOnly ? 'fa-gem' : 'fa-cube'}`}></i>}</div>
                <div className={`font-black text-base quality-${mat.quality} truncate w-full`}>{mat.name}</div>
                <div className="text-xs text-zinc-400 font-bold mt-2 bg-zinc-800/80 px-2 py-1 rounded-full border border-zinc-700/50 flex items-center justify-center gap-1.5 w-full leading-tight min-h-[2rem]">{mat.effectType === 'DURABILITY' && <i className="fas fa-shield-alt text-zinc-400"></i>}{mat.effectType === 'COST_REDUCTION' && <i className="fas fa-feather text-blue-400"></i>}{mat.effectType === 'SCORE_MULT' && <i className="fas fa-star text-yellow-500"></i>}{mat.effectType === 'COST_REDUCTION' ? `消耗 -${Math.round(mat.effectValue*100)}%` : mat.description}</div>
            </div>
            {isLocked ? (
                <button disabled className="w-full py-2 bg-zinc-800 text-zinc-500 font-bold rounded-xl border border-zinc-700 text-sm flex items-center justify-center gap-2 mt-auto"><i className="fas fa-lock"></i><span>LV.{unlockLevel}</span></button>
            ) : (
                <button onClick={() => onBuyMaterial(mat, slotIndex)} disabled={isSoldOut} className={`w-full py-2 ${isLimited ? 'bg-purple-900/20 border-purple-500/30 text-purple-300 hover:bg-purple-900/40' : 'bg-zinc-800 hover:bg-zinc-700 text-yellow-500 border-zinc-700'} font-bold rounded-xl border text-xl transition active:scale-95 flex items-center justify-center gap-2 mt-auto shadow-md disabled:opacity-50 disabled:grayscale`}>
                    <i className="fas fa-coins text-sm"></i><span>{mat.price}</span>
                </button>
            )}
        </div>
      );
  };

  // Row 1: Common Base (Iron 1, Copper 1, Gold 1)
  const commonBaseMats = MATERIALS.filter(m => m.quality === Quality.Common && !m.isDungeonOnly && !m.isRareBase).slice(0, 3);
  // Row 2: Refined Base (Iron 2, Copper 2, Gold 2)
  const refinedBaseMats = MATERIALS.filter(m => m.quality === Quality.Refined && !m.isDungeonOnly && !m.isRareBase).slice(0, 3);

  const restockProgress = player.itemsSoldSinceRestock;
  const restockTarget = 10;
  const isBlackMarketUnlocked = player.level >= 3;

  return (
     <div className="space-y-4 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
     <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
      <h2 className="text-2xl mb-4 font-black flex items-center text-zinc-200 uppercase tracking-widest"><i className="fas fa-shopping-cart mr-3 text-green-500"></i> 基础供应</h2>
      
      {/* Row 1 */}
      <div className="grid grid-cols-3 gap-3 mb-3">
          {commonBaseMats.map(mat => renderMaterialCard(mat, player.level < 1, 1))}
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-3">
          {refinedBaseMats.map(mat => renderMaterialCard(mat, player.level < 2, 2))}
      </div>
     </div>

     {/* Black Market */}
     <div className={`bg-zinc-950 p-6 rounded-2xl border ${isBlackMarketUnlocked ? 'border-purple-900/30' : 'border-zinc-800'} relative overflow-hidden`}>
         {!isBlackMarketUnlocked && (
             <div className="absolute inset-0 bg-zinc-950/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm border-2 border-dashed border-zinc-800 rounded-2xl">
                 <i className="fas fa-lock text-4xl text-zinc-600 mb-2"></i>
                 <div className="text-xl font-black text-zinc-500 uppercase tracking-widest">黑市 (LV.3 解锁)</div>
             </div>
         )}
         
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
         <div className="flex justify-between items-end mb-4 relative z-10">
             <h2 className="text-2xl font-black text-purple-400 uppercase tracking-widest flex items-center"><i className="fas fa-mask mr-3"></i> 黑市</h2>
             <div className="text-xs font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                 补货进度: <span className={`${restockProgress >= restockTarget ? 'text-green-500' : 'text-orange-500'}`}>{restockProgress}</span>/{restockTarget} 件出售
             </div>
         </div>
         
         <div className="grid grid-cols-3 gap-3 relative z-10">
             {player.shopSlots && player.shopSlots.length > 0 ? player.shopSlots.map((slot, idx) => (
                 renderMaterialCard(slot.item, false, 0, true, slot.soldOut, idx)
             )) : <div className="col-span-3 text-center text-zinc-600 py-4">黑市暂时关闭...</div>}
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
                <div><div className="flex justify-between items-start mb-4"><div className="flex items-center gap-4 overflow-hidden w-full"><div className={`w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-zinc-800 shrink-0 quality-${item.quality}`}><i className={`fas ${item.type === 'WEAPON' ? 'fa-khanda' : 'fa-shield-alt'} text-2xl`}></i></div><div className="min-w-0 flex-1"><div className={`font-bold text-lg quality-${item.quality} truncate`}>{item.name}</div><div className={`text-sm font-bold ${item.type === 'WEAPON' ? 'text-red-400' : 'text-blue-400'}`}>{item.type === 'WEAPON' ? '武器' : '防具'}</div></div></div></div><div className="bg-black/20 rounded-xl p-4 mb-4 space-y-2 border border-zinc-800/50">{item.stats.map((s:any, i:number) => <div key={i} className="flex justify-between text-base"><span className="text-zinc-300 font-bold">{s.label}</span><span className="text-zinc-200 font-bold">+{s.value}{s.suffix}</span></div>)}</div></div>
                <button onClick={() => onSellItem(item)} disabled={isEquipped} className={`w-full py-4 text-base font-bold rounded-xl border transition ${isEquipped ? 'opacity-30 cursor-not-allowed border-transparent bg-zinc-900 text-zinc-500' : 'bg-zinc-800 hover:bg-zinc-700 text-red-500 border-zinc-700 hover:border-red-500/50'}`}>出售 {item.value} G</button>
            </div>
           )
        })}
      </div>
     </div>
  </div>
  );
};
