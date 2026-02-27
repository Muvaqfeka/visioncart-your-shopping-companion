export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  features: string[];
  available: boolean;
  emoji: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const categories: Category[] = [
  { id: "electronics", name: "Electronics", emoji: "🎧", description: "Smart devices & gadgets" },
  { id: "groceries", name: "Groceries", emoji: "🥑", description: "Fresh food & essentials" },
  { id: "personal-care", name: "Personal Care", emoji: "🧴", description: "Health & beauty products" },
];

export const products: Product[] = [
  // Electronics
  { id: "e1", name: "Wireless Noise-Cancelling Headphones", brand: "SoundMax", price: 149.99, category: "electronics", features: ["Active Noise Cancelling", "40h Battery", "Bluetooth 5.3", "Hi-Res Audio"], available: true, emoji: "🎧" },
  { id: "e2", name: "Smart Fitness Watch", brand: "PulseTech", price: 229.99, category: "electronics", features: ["Heart Rate Monitor", "GPS Tracking", "7-day Battery", "Water Resistant"], available: true, emoji: "⌚" },
  { id: "e3", name: "Portable Bluetooth Speaker", brand: "BassWave", price: 79.99, category: "electronics", features: ["360° Sound", "Waterproof IPX7", "12h Playback", "Voice Assistant"], available: true, emoji: "🔊" },
  { id: "e4", name: "Wireless Charging Pad", brand: "ChargeFast", price: 34.99, category: "electronics", features: ["15W Fast Charge", "LED Indicator", "Universal Compatibility", "Slim Design"], available: false, emoji: "🔋" },
  // Groceries
  { id: "g1", name: "Organic Arabica Coffee Beans", brand: "MountainBrew", price: 18.99, category: "groceries", features: ["100% Organic", "Fair Trade", "Medium Roast", "1lb Bag"], available: true, emoji: "☕" },
  { id: "g2", name: "Extra Virgin Olive Oil", brand: "GoldenGrove", price: 14.99, category: "groceries", features: ["Cold Pressed", "First Harvest", "500ml Bottle", "Italian Origin"], available: true, emoji: "🫒" },
  { id: "g3", name: "Dark Chocolate Bar 85%", brand: "CocoaLux", price: 6.99, category: "groceries", features: ["85% Cacao", "No Added Sugar", "Vegan", "100g Bar"], available: true, emoji: "🍫" },
  { id: "g4", name: "Japanese Green Tea Matcha", brand: "ZenLeaf", price: 24.99, category: "groceries", features: ["Ceremonial Grade", "Stone Ground", "Organic", "30g Tin"], available: true, emoji: "🍵" },
  // Personal Care
  { id: "p1", name: "Hydrating Face Cream SPF30", brand: "GlowSkin", price: 32.99, category: "personal-care", features: ["SPF 30 Protection", "Hyaluronic Acid", "Lightweight Formula", "All Skin Types"], available: true, emoji: "🧴" },
  { id: "p2", name: "Natural Argan Oil Shampoo", brand: "PureRoots", price: 15.99, category: "personal-care", features: ["Sulfate Free", "Argan Oil Infused", "Gentle Cleansing", "350ml Bottle"], available: true, emoji: "🧴" },
  { id: "p3", name: "Mineral Sunscreen Lotion", brand: "SunShield", price: 19.99, category: "personal-care", features: ["SPF 50+", "Reef Safe", "Water Resistant", "Broad Spectrum"], available: true, emoji: "☀️" },
  { id: "p4", name: "Organic Lip Balm Set", brand: "BeeNatural", price: 9.99, category: "personal-care", features: ["Pack of 4", "Beeswax Formula", "Natural Flavors", "Moisturizing"], available: true, emoji: "💋" },
];

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter((p) => p.category === categoryId);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function findCategoryByVoice(input: string): Category | undefined {
  const lower = input.toLowerCase();
  return categories.find(
    (c) =>
      lower.includes(c.id) ||
      lower.includes(c.name.toLowerCase())
  );
}
