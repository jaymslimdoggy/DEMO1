import React from 'react';
import { Player, Quality, Equipment } from '../../types';
import { MATERIALS } from '../../constants';

interface ShopViewProps {
  player: Player;
  onBuyMaterial: (mat: any) => void;
  onSellItem: (item: Equipment) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ player, onBuyMaterial, onSellItem }) => {
  const getMaterialUnlockLevel = (quality: Quality) => {
    if (quality === Quality.Common) return 1;
    if (quality === Quality.Refined) return 2;
    if (quality === Quality.Rare) return 3;
    return 1;
  };

  return (
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
                {isLocked ? <button disabled className="w-full py-3 bg-zinc-800 text-zinc-500 font-bold rounded-xl border border-zinc-700 text-base flex items-center justify-center gap-2 mt-auto"><i className="fas fa-lock"></i><span>LV.{unlockLevel} 解锁</span></button> : <button onClick={() => onBuyMaterial(mat)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-yellow-500 font-bold rounded-xl border border-zinc-700 text-2xl transition active:scale-95 flex items-center justify-center gap-2 mt-auto shadow-md"><i className="fas fa-coins text-lg"></i><span>{mat.price}</span></button>}
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
                <button onClick={() => onSellItem(item)} disabled={isEquipped} className={`w-full py-4 text-base font-bold rounded-xl border transition ${isEquipped ? 'opacity-30 cursor-not-allowed border-transparent bg-zinc-900 text-zinc-500' : 'bg-zinc-800 hover:bg-zinc-700 text-red-500 border-zinc-700 hover:border-red-500/50'}`}>出售 {item.value} G</button>
            </div>
           )
        })}
      </div>
     </div>
  </div>
  );
};