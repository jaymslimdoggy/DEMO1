
import React from 'react';

export interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'exp' | 'score' | 'durability_loss' | 'player_damage';
  x: number;
  y: number;
}

interface FloatingTextLayerProps {
  texts: FloatingText[];
}

export const FloatingTextLayer: React.FC<FloatingTextLayerProps> = ({ texts }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
      {texts.map(ft => (
        <div 
           key={ft.id} 
           className={`absolute font-black text-3xl animate-floatUp pointer-events-none text-stroke whitespace-nowrap ${
             ft.type === 'damage' ? 'text-yellow-400 text-4xl' : 
             ft.type === 'player_damage' ? 'text-red-600 text-4xl' :
             ft.type === 'durability_loss' ? 'text-red-500 scale-125' : 
             ft.type === 'heal' ? 'text-green-500' : 
             ft.type === 'score' ? 'text-yellow-400 text-4xl drop-shadow-[0_0_10px_gold]' :
             'text-blue-400'
           }`}
           style={{ 
             transform: `translate(${ft.x}px, ${ft.y}px)`, 
             '--tw-translate-x': `${ft.x}px`,
             '--tw-translate-y': `${ft.y}px`,
           } as React.CSSProperties}
        >
           {ft.text}
        </div>
      ))}
    </div>
  );
};
