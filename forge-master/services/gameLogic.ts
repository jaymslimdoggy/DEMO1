
import { Quality, Equipment, EquipmentType, Stat, Material } from '../types';
import { STAT_CONFIG } from '../constants';

export const generateEquipment = (type: EquipmentType, materials: Quality[], playerLevel: number = 1, isBossDrop: boolean = false): Equipment => {
  const totalMaterialValue = materials.reduce((sum, q) => sum + q, 0);
  const id = Math.random().toString(36).substr(2, 9);
  
  // Quality determination
  let resultQuality = Quality.Common;
  if (totalMaterialValue >= 7 || (isBossDrop && Math.random() > 0.5)) resultQuality = Quality.Rare;
  else if (totalMaterialValue >= 4) resultQuality = Quality.Refined;

  // 1、根据品质限制属性条数：白色2，绿色3，金色4
  // 注意：原来的代码中statCount受材料价值限制，这里根据需求优化
  const maxStatCount = resultQuality === Quality.Rare ? 4 : (resultQuality === Quality.Refined ? 3 : 2);
  const statCount = Math.min(maxStatCount, Math.floor(totalMaterialValue / 1.5) + 1);
  
  // 固定排序顺序定义
  const weaponOrder: Stat['type'][] = ['ATK', 'CRIT', 'LIFESTEAL'];
  const armorOrder: Stat['type'][] = ['HP', 'DEF', 'LIFESTEAL'];
  const order = type === 'WEAPON' ? weaponOrder : armorOrder;
  
  // 增加池子确保即使抽4条也有足够选择
  const shuffledPool = [...order].sort(() => 0.5 - Math.random());
  const selectedKeys: Stat['type'][] = [];
  
  for (let i = 0; i < statCount; i++) {
    // 允许属性重复以填满条数，或者扩展池子
    selectedKeys.push(shuffledPool[i % shuffledPool.length]);
  }

  selectedKeys.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  // 2-3、计算等级和品质影响因子
  // 角色达到5级后，等级因子恒定为1，不再受等级压制
  const levelFactor = playerLevel >= 5 ? 1 : (0.2 + (playerLevel / 5) * 0.8);
  // 品质因子：基于材料总价值
  const qualityFactor = 0.5 + (totalMaterialValue / 9) * 0.5;
  // 基础收益系数（用于生命/攻击/防御）
  const levelMultiplier = 1 + (playerLevel - 1) * 0.15;

  const selectedStats: Stat[] = selectedKeys.map(typeKey => {
    const config = STAT_CONFIG[typeKey];
    const randomBoost = 0.8 + Math.random() * 0.4;
    let finalValue = 0;

    if (typeKey === 'CRIT' || typeKey === 'LIFESTEAL') {
      // 优化吸血和暴击属性：受等级(5级前)和材料品质影响
      const maxVal = typeKey === 'CRIT' ? 20 : 10;
      // 计算逻辑：最大值 * 等级因子 * 品质因子 * 随机浮动
      finalValue = Math.ceil(maxVal * levelFactor * qualityFactor * randomBoost);
      // 4、设置属性上限
      finalValue = Math.min(maxVal, finalValue);
    } else {
      // 普通属性：受等级收益系数影响
      const baseValue = (config.base + config.scale * totalMaterialValue) * levelMultiplier;
      finalValue = Math.floor(baseValue * randomBoost);
    }
    
    return {
      type: typeKey,
      label: config.label,
      value: finalValue,
      suffix: config.suffix
    };
  });

  const namePrefix = resultQuality === Quality.Rare ? '传说' : (resultQuality === Quality.Refined ? '精炼' : '普通的');
  const typeName = type === 'WEAPON' ? '神兵' : '护甲';
  
  const materialCosts = { [Quality.Common]: 10, [Quality.Refined]: 50, [Quality.Rare]: 200 };
  const totalCost = materials.reduce((sum, q) => sum + materialCosts[q], 0);
  const saleValue = Math.floor(totalCost * (0.6 + resultQuality * 0.1) * (1 + (playerLevel - 1) * 0.05));

  return {
    id,
    name: `${namePrefix}${typeName}`,
    type,
    quality: resultQuality,
    stats: selectedStats,
    value: saleValue,
    materialsUsed: materials
  };
};
