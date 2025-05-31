import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function detectUnitFromItemName(itemName: string): string {
  const name = itemName.toLowerCase();

  // Specific product patterns
  if (name.includes('dozen') || name.includes('12 pack') || name.includes('eggs')) return 'DOZEN';
  if (name.includes('gallon') || (name.includes('milk') && !name.includes('almond') && !name.includes('coconut'))) return 'GALLON';
  if (name.includes('loaf') || name.includes('bread')) return 'LOAF';
  if (name.includes('bunch') || name.includes('bananas') || name.includes('spinach')) return 'BUNCH';
  if (name.includes('bag') || name.includes('chips') || name.includes('rice') || name.includes('flour')) return 'BAG';

  // Beverages - prioritize bottle/can over gallon for most drinks
  if (name.includes('sparkling water') || name.includes('seltzer') || name.includes('carbonated water')) return 'BOTTLE';
  if (name.includes('water') && (name.includes('bottle') || name.includes('pack'))) return 'BOTTLE';
  if (name.includes('soda') || name.includes('cola') || name.includes('pepsi') || name.includes('coke')) return 'BOTTLE';
  if (name.includes('juice') && !name.includes('gallon')) return 'BOTTLE';
  if (name.includes('beer') || name.includes('wine')) return 'BOTTLE';
  if (name.includes('bottle')) return 'BOTTLE';

  if (name.includes('jar') || name.includes('peanut butter') || name.includes('jam')) return 'JAR';
  if (name.includes('can') || name.includes('soup') || name.includes('beans') || name.includes('tuna')) return 'CAN';
  if (name.includes('box') || name.includes('cereal') || name.includes('pasta')) return 'BOX';
  if (name.includes('pack') || name.includes('gum') || name.includes('batteries')) return 'PACK';
  if (name.includes('roll') || name.includes('toilet paper') || name.includes('paper towel')) return 'ROLL';

  // Weight-based items
  if (name.includes('lb') || name.includes('pound') || 
      name.includes('meat') || name.includes('chicken') || name.includes('beef') || 
      name.includes('fish') || name.includes('salmon') || name.includes('turkey') ||
      name.includes('cheese') || name.includes('deli')) return 'LB';

  // Produce items typically sold by weight or count
  if (name.includes('apple') || name.includes('orange') || name.includes('lemon') || 
      name.includes('lime') || name.includes('onion') || name.includes('potato') ||
      name.includes('avocado') || name.includes('bell pepper')) return 'COUNT';

  if (name.includes('tomato') || name.includes('carrot') || name.includes('grape') ||
      name.includes('strawberry') || name.includes('blueberry')) return 'LB';

  // Default
  return 'COUNT';
}