export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  features: string[];
  available: boolean;
  emoji: string;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
  image: string;
}

export const categories: Category[] = [
  { id: "electronics", name: "Electronics", emoji: "🎧", description: "Smart devices & gadgets", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80" },
  { id: "groceries", name: "Groceries", emoji: "🥑", description: "Fresh food & essentials", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80" },
  { id: "personal-care", name: "Personal Care", emoji: "🧴", description: "Health & beauty products", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80" },
];

export const products: Product[] = [
  // Electronics
  { id: "e1", name: "Wireless Noise-Cancelling Headphones", brand: "SoundMax", price: 12499, category: "electronics", features: ["Active Noise Cancelling", "40h Battery", "Bluetooth 5.3", "Hi-Res Audio"], available: true, emoji: "🎧", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80" },
  { id: "e2", name: "Smart Fitness Watch", brand: "PulseTech", price: 18999, category: "electronics", features: ["Heart Rate Monitor", "GPS Tracking", "7-day Battery", "Water Resistant"], available: true, emoji: "⌚", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80" },
  { id: "e3", name: "Portable Bluetooth Speaker", brand: "BassWave", price: 6599, category: "electronics", features: ["360° Sound", "Waterproof IPX7", "12h Playback", "Voice Assistant"], available: true, emoji: "🔊", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80" },
  { id: "e4", name: "Wireless Charging Pad", brand: "ChargeFast", price: 2899, category: "electronics", features: ["15W Fast Charge", "LED Indicator", "Universal Compatibility", "Slim Design"], available: false, emoji: "🔋", image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&q=80" },
  // Groceries
  { id: "g1", name: "Organic Arabica Coffee Beans", brand: "MountainBrew", price: 1599, category: "groceries", features: ["100% Organic", "Fair Trade", "Medium Roast", "500g Bag"], available: true, emoji: "☕", image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80" },
  { id: "g2", name: "Extra Virgin Olive Oil", brand: "GoldenGrove", price: 1249, category: "groceries", features: ["Cold Pressed", "First Harvest", "500ml Bottle", "Italian Origin"], available: true, emoji: "🫒", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { id: "g3", name: "Dark Chocolate Bar 85%", brand: "CocoaLux", price: 549, category: "groceries", features: ["85% Cacao", "No Added Sugar", "Vegan", "100g Bar"], available: true, emoji: "🍫", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&q=80" },
  { id: "g4", name: "Japanese Green Tea Matcha", brand: "ZenLeaf", price: 2099, category: "groceries", features: ["Ceremonial Grade", "Stone Ground", "Organic", "30g Tin"], available: true, emoji: "🍵", image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&q=80" },
  // Personal Care
  { id: "p1", name: "Hydrating Face Cream SPF30", brand: "GlowSkin", price: 2749, category: "personal-care", features: ["SPF 30 Protection", "Hyaluronic Acid", "Lightweight Formula", "All Skin Types"], available: true, emoji: "🧴", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80" },
  { id: "p2", name: "Natural Argan Oil Shampoo", brand: "PureRoots", price: 1329, category: "personal-care", features: ["Sulfate Free", "Argan Oil Infused", "Gentle Cleansing", "350ml Bottle"], available: true, emoji: "🧴", image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&q=80" },
  { id: "p3", name: "Mineral Sunscreen Lotion", brand: "SunShield", price: 1649, category: "personal-care", features: ["SPF 50+", "Reef Safe", "Water Resistant", "Broad Spectrum"], available: true, emoji: "☀️", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80" },
  { id: "p4", name: "Organic Lip Balm Set", brand: "BeeNatural", price: 829, category: "personal-care", features: ["Pack of 4", "Beeswax Formula", "Natural Flavors", "Moisturizing"], available: true, emoji: "💋", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&q=80" },
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
