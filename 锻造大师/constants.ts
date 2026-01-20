
import { Material, Quality } from './types';

export const MATERIALS: Material[] = [
  { id: 'm1', quality: Quality.Common, name: '普通的矿石', price: 10 },
  { id: 'm2', quality: Quality.Refined, name: '优质的矿石', price: 50 },
  { id: 'm3', quality: Quality.Rare, name: '稀有的矿石', price: 200 },
];

export const STAT_CONFIG = {
  HP: { label: '生命值', suffix: '', base: 50, scale: 20 },
  ATK: { label: '攻击', suffix: '', base: 10, scale: 5 },
  DEF: { label: '防御', suffix: '', base: 5, scale: 3 },
  CRIT: { label: '暴击率', suffix: '%', base: 5, scale: 2.5 },
  LIFESTEAL: { label: '吸血', suffix: '%', base: 2, scale: 1.5 },
};

export const INITIAL_GOLD = 200;
