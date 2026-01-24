
import React from 'react';
import { Equipment, Quality } from '../../types';

interface ItemCardProps {
  item: Equipment;
  onClick: () => void; // 查看详情
  onEquip: () => void; // 直接装备
  isEquipped?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick, onEquip, isEquipped = false }) => {
  const durabilityRatio = item.currentDurability / item.maxDurability;
  
  return (
    <div 
      onClick={onClick} 
      className={`bg-zinc-900 border rounded-xl p-3 flex flex-col relative group cursor-pointer hover:border-zinc-500 transition active:scale-95 shadow-sm ${
        isEquipped ? 'border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.3)] bg-green-950/20' : 'border-zinc-800'
      }`}
    >
        {isEquipped && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-green-400 text-[10px] font-black bg-green-950 px-2 py-0.5 rounded-full border border-green-800 shadow z-10">
            当前装备
          </div>
        )}
        
        <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-xl border border-zinc-800/50 quality-${item.quality}`}>
                <i className={`fas ${item.type === 'WEAPON' ? 'fa-khanda' : 'fa-shield-alt'}`}></i>
            </div>
            <div className="min-w-0">
                <div className={`font-bold text-sm quality-${item.quality} truncate`}>{item.name}</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase">{item.type === 'WEAPON' ? '武器' : '防具'}</div>
            </div>
        </div>
        
        <div className="w-full bg-zinc-950 h-1.5 rounded-full border border-zinc-700 overflow-hidden mb-2">
            <div className={`h-full ${durabilityRatio < 0.3 ? 'bg-red-500' : 'bg-blue-400'}`} style={{width: `${durabilityRatio * 100}%`}}></div>
        </div>
        
        <div className="bg-black/20 rounded-lg p-2 mb-2 space-y-0.5 border border-zinc-800/30 flex-1">
            {item.stats.map((s, i) => (
                <div key={i} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{s.label}</span>
                    <span className="text-zinc-300">+{s.value}{s.suffix}</span>
                </div>
            ))}
        </div>
        
        <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                if (!isEquipped) onEquip(); 
            }} 
            disabled={isEquipped} 
            className={`w-full py-2 rounded-lg font-bold text-xs border transition-colors z-10 relative ${
                isEquipped ? 'bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed' : 'bg-green-700 hover:bg-green-600 text-white border-green-600 shadow-md'
            }`}
        >
            {isEquipped ? '已穿戴' : '直接装备'}
        </button>
    </div>
  );
};
