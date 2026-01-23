
import React from 'react';
import { Player, Equipment } from '../../types';
import { ItemCard } from '../Shared/ItemCard';

interface BagViewProps {
  player: Player;
  totalStats: any;
  weaponList: Equipment[];
  armorList: Equipment[];
  onInspectItem: (item: Equipment) => void;
  onEquipItem: (item: Equipment) => void; 
}

export const BagView: React.FC<BagViewProps> = ({ player, totalStats, weaponList, armorList, onInspectItem, onEquipItem }) => {
  return (
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
                {weaponList.map(item => (
                  <ItemCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => onInspectItem(item)} 
                    onEquip={() => onEquipItem(item)}
                    isEquipped={player.equippedWeapon?.id === item.id} 
                  />
                ))}
            </div>
        </div>
        {/* ARMOR COLUMN */}
        <div className="flex-1 flex flex-col min-w-0">
            <div className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center justify-center bg-blue-950/30 p-2 rounded-lg border border-blue-900/30"><i className="fas fa-shield-alt mr-2"></i> 防具库</div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 p-1">
                {armorList.length === 0 && <div className="text-center text-zinc-600 py-8 italic text-xs">暂无防具</div>}
                {armorList.map(item => (
                  <ItemCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => onInspectItem(item)} 
                    onEquip={() => onEquipItem(item)}
                    isEquipped={player.equippedArmor?.id === item.id} 
                  />
                ))}
            </div>
        </div>
    </div>
  </div>
  );
};
