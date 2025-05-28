import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Smart unit detection based on item name
export function detectUnitFromItemName(itemName: string): string {
  // Convert to lowercase for consistent matching
  const name = itemName.toLowerCase();

  // Items typically measured by weight (pounds/lb)
  const weightItems = [
    'apple', 'apples', 'potato', 'potatoes', 'onion', 'onions', 
    'beef', 'chicken', 'pork', 'steak', 'meat', 'fish', 'salmon', 'tuna',
    'ground beef', 'ground turkey', 'ground chicken',
    'banana', 'bananas', 'orange', 'oranges', 'grape', 'grapes',
    'tomato', 'tomatoes', 'carrot', 'carrots',
    'flour', 'sugar', 'rice', 'beans', 'lentil', 'lentils'
  ];

  // Items typically measured by count
  const countItems = [
    'egg', 'eggs', 'bread', 'loaf', 'bagel', 'bagels',
    'cereal', 'toy', 'book', 'plate', 'cup', 'spoon', 'fork', 'knife',
    'box', 'package', 'can', 'bottle', 'jar',
    'shirt', 'pants', 'socks', 'shoe', 'shoes'
  ];

  // Items typically measured by ounces
  const ounceItems = [
    'cheese', 'yogurt', 'cream cheese', 'sour cream',
    'dip', 'hummus', 'sauce', 'dressing'
  ];

  // Items typically sold in packages
  const packageItems = [
    'cookie', 'cookies', 'cracker', 'crackers', 
    'chip', 'chips', 'snack', 'candy', 'chocolate',
    'frozen', 'waffles', 'pancakes', 'dinner', 'entree'
  ];
  
    const gallonItems = ['milk', 'juice', 'water'];

  // Specific packaging types
  const rollItems = ['toilet paper', 'paper towel', 'paper towels', 'tissue'];
  const boxItems = ['cereal', 'pasta', 'rice', 'crackers', 'detergent', 'tissues'];
  const canItems = ['soup', 'beans', 'corn', 'peas', 'tuna', 'sauce', 'soda', 'beer'];
  const bottleItems = ['water', 'soda', 'juice', 'milk', 'wine', 'beer', 'oil', 'vinegar', 'ketchup', 'mustard', 'syrup'];
  const jarItems = ['jam', 'jelly', 'peanut butter', 'salsa', 'sauce', 'pickles', 'olives'];
  const bunchItems = ['banana', 'bananas', 'asparagus', 'kale', 'cilantro', 'parsley', 'mint', 'herb', 'herbs', 'green onion', 'green onions'];

  // Check for specific matches first
  for (const item of gallonItems) {
    if (name.includes(item)) {
      return 'GALLON';
    }
  }

  for (const item of weightItems) {
    if (name.includes(item)) {
      return 'LB';
    }
  }

  for (const item of countItems) {
    if (name.includes(item)) {
      return 'COUNT';
    }
  }

  for (const item of ounceItems) {
    if (name.includes(item)) {
      return 'OZ';
    }
  }

  for (const item of packageItems) {
    if (name.includes(item)) {
      return 'PKG';
    }
  }

  // Check item name against our lists
  for (const word of name.split(' ')) {
    if (rollItems.some(item => name.includes(item))) return 'ROLL';
    if (boxItems.some(item => name.includes(item))) return 'BOX';
    if (canItems.some(item => name.includes(item))) return 'CAN';
    if (bottleItems.some(item => name.includes(item))) return 'BOTTLE';
    if (jarItems.some(item => name.includes(item))) return 'JAR';
    if (bunchItems.some(item => name.includes(item))) return 'BUNCH';
    if (packageItems.some(item => name.includes(item))) return 'PKG';
    if (ounceItems.some(item => name.includes(item))) return 'OZ';
    if (weightItems.some(item => name.includes(item))) return 'LB';
    if (countItems.some(item => name.includes(item))) return 'COUNT';
  }

  // Default to COUNT if no match is found
  return 'COUNT';
}