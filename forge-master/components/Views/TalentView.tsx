
import React, { useState } from 'react';
import { Player, TalentNode } from '../../types';
import { TALENT_TREE } from '../../constants';

interface TalentViewProps {
  player: Player;
  onUnlockTalent: (talentId: string, cost: number) => void;
}

export const TalentView: React.FC<TalentViewProps> = ({ player, onUnlockTalent }) => {
  const [selectedTalent, setSelectedTalent] = useState<TalentNode | null>(null);

  const branches = {
      DURABILITY: TALENT_TREE.filter(t => t.branch === 'DURABILITY'),
      QUALITY: TALENT_TREE.filter(t => t.branch === 'QUALITY'),
      EXPLORATION: TALENT_TREE.filter(t => t.branch === 'EXPLORATION'),
  };

  const getNodeStatus = (node: TalentNode) => {
      const isUnlocked = player.unlockedTalents.includes(node.id);
      if (isUnlocked) return 'UNLOCKED';
      
      const parentUnlocked = !node.parentId || player.unlockedTalents.includes(node.parentId);
      const levelMet = player.level >= node.reqLevel;
      
      if (parentUnlocked && levelMet) return 'AVAILABLE';
      return 'LOCKED';
  };

  const handleUnlock = () => {
      if (!selectedTalent) return;
      if (player.gold >= selectedTalent.cost) {
          onUnlockTalent(selectedTalent.id, selectedTalent.cost);
          setSelectedTalent(null);
      }
  };

  const renderNode = (node: TalentNode) => {
      const status = getNodeStatus(node);
      const isSelected = selectedTalent?.id === node.id;
      
      let bgClass = 'bg-zinc-800 border-zinc-700';
      let iconClass = 'text-zinc-600';
      let icon = 'fa-lock';
      
      if (status === 'UNLOCKED') {
          bgClass = node.branch === 'DURABILITY' ? 'bg-red-900/40 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
                    node.branch === 'QUALITY' ? 'bg-blue-900/40 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' :
                    'bg-green-900/40 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
          iconClass = 'text-white';
          icon = node.branch === 'DURABILITY' ? 'fa-shield-alt' :
                 node.branch === 'QUALITY' ? 'fa-star' : 'fa-compass';
      } else if (status === 'AVAILABLE') {
          bgClass = 'bg-zinc-700 border-yellow-500/50 animate-pulse';
          iconClass = 'text-yellow-500';
          icon = 'fa-unlock';
      }

      if (isSelected) {
          bgClass += ' ring-2 ring-white scale-110 z-10';
      }

      return (
          <div key={node.id} className="flex flex-col items-center relative mb-8">
               <button 
                  onClick={() => setSelectedTalent(node)}
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl transition-all duration-300 ${bgClass} ${iconClass}`}
               >
                   <i className={`fas ${icon}`}></i>
               </button>
               {/* Connecting Line to next tier visually handled by container gap, but could be svg */}
               <div className={`mt-2 text-[10px] font-bold uppercase tracking-wider text-center max-w-[80px] ${status === 'UNLOCKED' ? 'text-white' : 'text-zinc-500'}`}>
                   {node.name}
               </div>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 rounded-2xl border border-zinc-700 relative overflow-hidden animate-fadeIn">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-700 bg-zinc-900/90 shrink-0 flex justify-between items-center z-10">
            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-widest"><i className="fas fa-drafting-compass mr-2 text-purple-500"></i> 匠艺传承</h2>
                <div className="text-zinc-400 text-sm mt-1">当前等级: <span className="text-white font-bold">{player.level}</span></div>
            </div>
            <div className="bg-black/40 px-4 py-2 rounded-xl border border-zinc-700">
                <span className="text-zinc-400 text-xs font-bold uppercase mr-2">剩余资金</span>
                <span className="text-yellow-400 text-2xl font-black">{player.gold}</span>
            </div>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto p-6 relative">
             <div className="grid grid-cols-3 gap-4 min-h-[600px]">
                 {/* Column 1: Durability */}
                 <div className="flex flex-col items-center relative">
                     <div className="text-red-500 font-black uppercase tracking-widest mb-8 border-b-2 border-red-900/30 pb-2">坚韧系</div>
                     <div className="absolute top-12 bottom-0 w-0.5 bg-red-900/20 -z-10"></div>
                     {branches.DURABILITY.map(renderNode)}
                 </div>

                 {/* Column 2: Quality */}
                 <div className="flex flex-col items-center relative">
                     <div className="text-blue-500 font-black uppercase tracking-widest mb-8 border-b-2 border-blue-900/30 pb-2">技艺系</div>
                     <div className="absolute top-12 bottom-0 w-0.5 bg-blue-900/20 -z-10"></div>
                     {branches.QUALITY.map(renderNode)}
                 </div>

                 {/* Column 3: Exploration */}
                 <div className="flex flex-col items-center relative">
                     <div className="text-green-500 font-black uppercase tracking-widest mb-8 border-b-2 border-green-900/30 pb-2">探险系</div>
                     <div className="absolute top-12 bottom-0 w-0.5 bg-green-900/20 -z-10"></div>
                     {branches.EXPLORATION.map(renderNode)}
                 </div>
             </div>
        </div>

        {/* Modal/Overlay for Selection */}
        {selectedTalent && (
            <div className="absolute inset-x-0 bottom-0 bg-zinc-900 border-t-2 border-zinc-600 p-6 shadow-2xl animate-slideUp z-20 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-white">{selectedTalent.name}</h3>
                        <div className="text-xs font-bold text-zinc-500 uppercase mt-1">Tier {selectedTalent.tier} • {selectedTalent.branch}</div>
                    </div>
                    <button onClick={() => setSelectedTalent(null)} className="text-zinc-500 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <p className="text-zinc-300 text-lg leading-relaxed">{selectedTalent.description}</p>
                
                <div className="flex gap-4 items-center mt-2">
                    {getNodeStatus(selectedTalent) === 'UNLOCKED' ? (
                        <div className="flex-1 bg-green-900/30 border border-green-600 text-green-400 py-3 rounded-xl font-bold text-center uppercase tracking-widest">
                            <i className="fas fa-check mr-2"></i> 已掌握
                        </div>
                    ) : getNodeStatus(selectedTalent) === 'LOCKED' ? (
                         <div className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-500 py-3 rounded-xl font-bold text-center uppercase tracking-widest flex items-center justify-center gap-2">
                            <i className="fas fa-lock"></i>
                            {player.level < selectedTalent.reqLevel ? `需要等级 ${selectedTalent.reqLevel}` : '需要前置科技'}
                        </div>
                    ) : (
                        <button 
                            onClick={handleUnlock}
                            disabled={player.gold < selectedTalent.cost}
                            className={`flex-1 py-4 rounded-xl font-black text-xl uppercase tracking-widest shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${player.gold >= selectedTalent.cost ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                        >
                            <span>学习技艺</span>
                            <span className="text-sm opacity-80 bg-black/20 px-2 py-0.5 rounded ml-2">{selectedTalent.cost} G</span>
                        </button>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
