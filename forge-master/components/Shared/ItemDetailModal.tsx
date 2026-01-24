
import React from 'react';
import { Equipment, Quality } from '../../types';

interface ItemDetailModalProps {
  item: Equipment;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
  isForgeResult?: boolean;
  onSecondaryAction?: () => void; // New prop for sell
  secondaryActionLabel?: string; // New prop label
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose, onAction, actionLabel = "关闭", isForgeResult = false, onSecondaryAction, secondaryActionLabel }) => {
  const durabilityRatio = item.currentDurability / item.maxDurability;
  
  return (
    <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-800 border-2 border-zinc-600 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_60px_rgba(0,0,0,0.5)] text-center relative overflow-hidden flex flex-col gap-4 max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className={`absolute top-0 left-0 w-full h-2 opacity-50 bg-gradient-to-r from-transparent via-${item.quality === Quality.Rare ? 'yellow-500' : item.quality === Quality.Refined ? 'green-500' : 'zinc-500'} to-transparent`}></div>
        <h2 className="text-2xl font-black mb-1 text-white italic tracking-widest uppercase drop-shadow-md shrink-0">{isForgeResult ? '神兵降世' : '装备详情'}</h2>
        
        <div className="shrink-0 mb-2">
            <div className={`text-4xl font-black mb-3 quality-${item.quality} drop-shadow-lg`}>{item.name}</div>
            <div className="flex justify-center gap-2 mb-2">
                <span className={`text-sm px-4 py-1 rounded border font-bold ${item.type === 'WEAPON' ? 'text-red-400 border-red-900/50 bg-red-950/30' : 'text-blue-400 border-blue-900/50 bg-blue-950/30'}`}>{item.type === 'WEAPON' ? '武器' : '防具'}</span>
                <div className="inline-block bg-zinc-900/80 px-4 py-1 rounded-full border border-zinc-700">
                    <span className="text-zinc-300 text-sm font-bold mr-2">评分</span>
                    <span className="text-yellow-400 font-mono text-xl font-black">{item.score || '???'}</span>
                </div>
            </div>
            
            <div className="w-full bg-zinc-900 h-2 rounded-full border border-zinc-700 overflow-hidden">
                <div className={`h-full ${durabilityRatio < 0.3 ? 'bg-red-500' : 'bg-blue-400'}`} style={{width: `${durabilityRatio * 100}%`}}></div>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{item.currentDurability} / {item.maxDurability} 耐久</div>
        </div>

        <div className="bg-zinc-900/80 rounded-2xl p-6 border border-zinc-700/80 shadow-inner flex-1 overflow-y-auto scrollbar-thin">
            <div className="space-y-3">
            {item.stats.map((s, i) => (
                <div key={i} className="flex justify-between items-center border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                <span className="text-zinc-300 font-bold text-xl uppercase">{s.label}</span>
                <span className="text-3xl font-black text-white">+{s.value}{s.suffix}</span>
                </div>
            ))}
            </div>
        </div>
        
        <div className="flex flex-col gap-3 shrink-0 mt-auto">
            <button 
                onClick={() => { if(onAction) onAction(); onClose(); }} 
                className={`w-full py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-black rounded-2xl transition shadow-lg tracking-widest uppercase transform active:scale-95 text-lg`}
            >
                {isForgeResult ? '收下' : actionLabel}
            </button>
            
            {onSecondaryAction && (
                <button 
                    onClick={() => { onSecondaryAction(); onClose(); }}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-red-500 font-black rounded-2xl transition shadow-lg tracking-widest uppercase transform active:scale-95 text-base"
                >
                    {secondaryActionLabel}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
