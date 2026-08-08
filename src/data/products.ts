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
  /** Pack size / unit, e.g. "500 ml", "1 kg" */
  unit?: string;
  /** Units left in stock */
  stock?: number;
  /** Tamil name, used for voice search + readout */
  tamilName?: string;
}



export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
  image: string;
}

export const categories: Category[] = [
  { id: "essentials", name: "Daily Essentials", emoji: "🛒", description: "Milk, bread, eggs & basics", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80" },
  { id: "electronics", name: "Electronics", emoji: "🎧", description: "Smart devices & gadgets", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80" },

  { id: "groceries", name: "Groceries", emoji: "🥑", description: "Fresh food & essentials", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80" },
  { id: "personal-care", name: "Personal Care", emoji: "🧴", description: "Health & beauty products", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80" },
  { id: "medicines", name: "Medicines", emoji: "💊", description: "Health & wellness medicines", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80" },
  { id: "clothing", name: "Clothing", emoji: "👕", description: "Apparel & ethnic wear", image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80" },
  { id: "home", name: "Home Essentials", emoji: "🏠", description: "Kitchen & home goods", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80" },
];

export const products: Product[] = [
  // Electronics
  { id: "e1", name: "Wireless Noise-Cancelling Headphones", brand: "SoundMax", price: 1299, category: "electronics", features: ["Active Noise Cancelling", "40h Battery", "Bluetooth 5.3", "Hi-Res Audio"], available: true, emoji: "🎧", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80" },
  { id: "e2", name: "Smart Fitness Watch", brand: "PulseTech", price: 1999, category: "electronics", features: ["Heart Rate Monitor", "GPS Tracking", "7-day Battery", "Water Resistant"], available: true, emoji: "⌚", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80" },
  { id: "e3", name: "Portable Bluetooth Speaker", brand: "BassWave", price: 699, category: "electronics", features: ["360° Sound", "Waterproof IPX7", "12h Playback", "Voice Assistant"], available: true, emoji: "🔊", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80" },
  { id: "e4", name: "Wireless Charging Pad", brand: "ChargeFast", price: 349, category: "electronics", features: ["15W Fast Charge", "LED Indicator", "Universal", "Slim Design"], available: true, emoji: "🔋", image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&q=80" },
  { id: "e5", name: "Smart LED Bulb", brand: "GlowHome", price: 249, category: "electronics", features: ["16M Colors", "Wi-Fi Controlled", "Voice Compatible", "9W"], available: true, emoji: "💡", image: "https://images.unsplash.com/photo-1565636192335-3f48d6d50962?w=400&q=80" },
  { id: "e6", name: "USB-C Power Bank 20000mAh", brand: "VoltCore", price: 1499, category: "electronics", features: ["20000 mAh", "22.5W Fast Charge", "Triple Port", "LED Display"], available: true, emoji: "🔌", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&q=80" },

  // Groceries
  { id: "g1", name: "Organic Arabica Coffee Beans", brand: "MountainBrew", price: 199, category: "groceries", features: ["100% Organic", "Fair Trade", "Medium Roast", "500g Bag"], available: true, emoji: "☕", image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80" },
  { id: "g2", name: "Extra Virgin Olive Oil", brand: "GoldenGrove", price: 249, category: "groceries", features: ["Cold Pressed", "First Harvest", "500ml", "Italian Origin"], available: true, emoji: "🫒", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { id: "g3", name: "Dark Chocolate Bar 85%", brand: "CocoaLux", price: 99, category: "groceries", features: ["85% Cacao", "No Added Sugar", "Vegan", "100g"], available: true, emoji: "🍫", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&q=80" },
  { id: "g4", name: "Japanese Matcha Green Tea", brand: "ZenLeaf", price: 349, category: "groceries", features: ["Ceremonial Grade", "Stone Ground", "Organic", "30g Tin"], available: true, emoji: "🍵", image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&q=80" },
  { id: "g5", name: "Basmati Rice Premium", brand: "IndiaGold", price: 449, category: "groceries", features: ["Aged 2 Years", "Long Grain", "Aromatic", "5 Kg Pack"], available: true, emoji: "🍚", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
  { id: "g6", name: "Cold-Pressed Coconut Oil", brand: "KeralaPure", price: 299, category: "groceries", features: ["Cold Pressed", "Virgin", "1 Litre", "Glass Bottle"], available: true, emoji: "🥥", image: "https://images.unsplash.com/photo-1590338669998-cc11a82d6c46?w=400&q=80" },
  { id: "g7", name: "Toor Dal Premium", brand: "AnnaPurna", price: 159, category: "groceries", features: ["Unpolished", "Hand Sorted", "1 Kg", "High Protein"], available: true, emoji: "🫘", image: "https://images.unsplash.com/photo-1599909533730-d5badf68d8d6?w=400&q=80" },

  // Personal Care
  { id: "p1", name: "Hydrating Face Cream SPF30", brand: "GlowSkin", price: 299, category: "personal-care", features: ["SPF 30", "Hyaluronic Acid", "Lightweight", "All Skin Types"], available: true, emoji: "🧴", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80" },
  { id: "p2", name: "Natural Argan Oil Shampoo", brand: "PureRoots", price: 179, category: "personal-care", features: ["Sulfate Free", "Argan Oil", "Gentle", "350ml"], available: true, emoji: "🧴", image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&q=80" },
  { id: "p3", name: "Mineral Sunscreen SPF50+", brand: "SunShield", price: 199, category: "personal-care", features: ["SPF 50+", "Reef Safe", "Water Resistant", "Broad Spectrum"], available: true, emoji: "☀️", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80" },
  { id: "p4", name: "Organic Lip Balm Set", brand: "BeeNatural", price: 129, category: "personal-care", features: ["Pack of 4", "Beeswax", "Natural Flavors", "Moisturizing"], available: true, emoji: "💋", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&q=80" },
  { id: "p5", name: "Bamboo Toothbrush Pack", brand: "EcoSmile", price: 149, category: "personal-care", features: ["Pack of 4", "Biodegradable", "Soft Bristles", "BPA Free"], available: true, emoji: "🪥", image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80" },
  { id: "p6", name: "Aloe Vera Body Lotion", brand: "FreshGlow", price: 199, category: "personal-care", features: ["100% Natural Aloe", "Non-Greasy", "400ml", "All Skin Types"], available: true, emoji: "🌿", image: "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400&q=80" },

  // Medicines
  { id: "m1", name: "Paracetamol 500mg Tablets", brand: "Dolo", price: 29, category: "medicines", features: ["Pack of 15", "Fever Relief", "Pain Relief", "Adult Use"], available: true, emoji: "💊", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80" },
  { id: "m2", name: "Vitamin C Effervescent", brand: "Limcee", price: 99, category: "medicines", features: ["Pack of 20", "1000mg Vit C", "Orange", "Immunity"], available: true, emoji: "🍊", image: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&q=80" },
  { id: "m3", name: "Cough Syrup 100ml", brand: "Benadryl", price: 89, category: "medicines", features: ["100ml", "Dry Cough", "Non-Drowsy", "Adults & Kids"], available: true, emoji: "🧴", image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&q=80" },
  { id: "m4", name: "Multivitamin Daily Tablets", brand: "Revital", price: 249, category: "medicines", features: ["Pack of 30", "12 Vitamins", "Daily Use", "Energy"], available: true, emoji: "💪", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&q=80" },
  { id: "m5", name: "Antiseptic Cream", brand: "Betadine", price: 65, category: "medicines", features: ["15g Tube", "Wound Care", "Antibacterial", "Fast Healing"], available: true, emoji: "🩹", image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=80" },
  { id: "m6", name: "Digital Thermometer", brand: "Omron", price: 199, category: "medicines", features: ["Fast Reading", "Fever Alarm", "Memory Recall", "Waterproof"], available: true, emoji: "🌡️", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&q=80" },
  { id: "m7", name: "ORS Hydration Powder", brand: "Electral", price: 49, category: "medicines", features: ["Pack of 10", "Orange Flavor", "Quick Rehydration", "WHO Formula"], available: true, emoji: "💧", image: "https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=400&q=80" },

  // Clothing
  { id: "c1", name: "Cotton Crew Neck T-Shirt", brand: "EveryWear", price: 399, category: "clothing", features: ["100% Cotton", "Pre-Shrunk", "Multiple Sizes", "Unisex"], available: true, emoji: "👕", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80" },
  { id: "c2", name: "Slim Fit Denim Jeans", brand: "BlueRiver", price: 1199, category: "clothing", features: ["Stretch Denim", "Slim Fit", "5 Pockets", "Indigo Wash"], available: true, emoji: "👖", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80" },
  { id: "c3", name: "Handloom Cotton Saree", brand: "Vasthra", price: 1499, category: "clothing", features: ["Pure Cotton", "Handloom Weave", "Blouse Piece", "Traditional"], available: true, emoji: "🥻", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80" },
  { id: "c4", name: "Kurta Pyjama Set", brand: "Manyavar", price: 1799, category: "clothing", features: ["Ethnic Wear", "Soft Cotton Blend", "Festive", "Multiple Sizes"], available: true, emoji: "🧥", image: "https://images.unsplash.com/photo-1622445275576-721325763afe?w=400&q=80" },
  { id: "c5", name: "Sports Running Shoes", brand: "StrideX", price: 1499, category: "clothing", features: ["Mesh Upper", "Cushion Sole", "Lightweight", "Anti-Slip"], available: true, emoji: "👟", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80" },
  { id: "c6", name: "Soft Wool Shawl", brand: "Kashmir Loom", price: 999, category: "clothing", features: ["Warm Wool", "Hand-Embroidered", "Unisex", "Premium"], available: true, emoji: "🧣", image: "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=400&q=80" },

  // Home Essentials
  { id: "h1", name: "Stainless Steel Pressure Cooker 5L", brand: "Prestige", price: 1899, category: "home", features: ["5 Litre", "Induction Base", "Safety Valve", "ISI Certified"], available: true, emoji: "🍲", image: "https://images.unsplash.com/photo-1584990347449-a8d8d3b3f3f3?w=400&q=80" },
  { id: "h2", name: "Non-Stick Frying Pan 26cm", brand: "Hawkins", price: 799, category: "home", features: ["26cm", "Non-Stick Coat", "Induction Friendly", "Heat Resistant Handle"], available: true, emoji: "🍳", image: "https://images.unsplash.com/photo-1574966740793-2cb46b6dd31e?w=400&q=80" },
  { id: "h3", name: "Bedsheet Cotton Double Bed", brand: "Bombay Dyeing", price: 899, category: "home", features: ["Pure Cotton", "Double Bed", "2 Pillow Covers", "Machine Washable"], available: true, emoji: "🛏️", image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&q=80" },
  { id: "h4", name: "Steel Water Bottle 1L", brand: "Milton", price: 349, category: "home", features: ["1 Litre", "Insulated", "Leak Proof", "BPA Free"], available: true, emoji: "🧴", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80" },
  { id: "h5", name: "LED Table Lamp", brand: "Philips", price: 599, category: "home", features: ["3-Step Dimming", "Eye-Care LED", "USB Powered", "Foldable Arm"], available: true, emoji: "🪔", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80" },
  { id: "h6", name: "Microfibre Cleaning Cloth Pack", brand: "Scotch-Brite", price: 199, category: "home", features: ["Pack of 6", "Lint-Free", "Reusable", "Multi-Surface"], available: true, emoji: "🧽", image: "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400&q=80" },

  // Daily Essentials (basic needs)
  { id: "d1", name: "Toned Milk", brand: "Aavin", price: 28, category: "essentials", unit: "500 ml pouch", stock: 42, tamilName: "பால்", features: ["Fresh Daily", "Toned 3% Fat", "Pasteurised", "500 ml"], available: true, emoji: "🥛", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80" },
  { id: "d2", name: "Whole Wheat Bread", brand: "Britannia", price: 45, category: "essentials", unit: "400 g loaf", stock: 25, tamilName: "ரொட்டி", features: ["100% Atta", "No Maida", "Soft Slices", "400 g"], available: true, emoji: "🍞", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80" },
  { id: "d3", name: "Farm Fresh Eggs", brand: "Suguna", price: 84, category: "essentials", unit: "Pack of 12", stock: 30, tamilName: "முட்டை", features: ["12 Eggs", "High Protein", "Farm Fresh", "Grade A"], available: true, emoji: "🥚", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80" },
  { id: "d4", name: "Fresh Curd", brand: "Aavin", price: 30, category: "essentials", unit: "400 g cup", stock: 18, tamilName: "தயிர்", features: ["Thick Set", "Probiotic", "No Preservatives", "400 g"], available: true, emoji: "🥣", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80" },
  { id: "d5", name: "Sugar", brand: "Madhur", price: 52, category: "essentials", unit: "1 kg", stock: 60, tamilName: "சர்க்கரை", features: ["Refined", "Sulphur Free", "1 Kg", "Sparkling White"], available: true, emoji: "🍬", image: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&q=80" },
  { id: "d6", name: "Iodised Salt", brand: "Tata", price: 28, category: "essentials", unit: "1 kg", stock: 55, tamilName: "உப்பு", features: ["Iodised", "Free Flow", "1 Kg", "Vacuum Evaporated"], available: true, emoji: "🧂", image: "https://images.unsplash.com/photo-1518110925495-b37e912cf2d3?w=400&q=80" },
  { id: "d7", name: "Whole Wheat Atta", brand: "Aashirvaad", price: 245, category: "essentials", unit: "5 kg", stock: 22, tamilName: "கோதுமை மாவு", features: ["100% Whole Wheat", "Chakki Fresh", "5 Kg", "High Fibre"], available: true, emoji: "🌾", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
  { id: "d8", name: "Onion", brand: "Local Farm", price: 38, category: "essentials", unit: "1 kg", stock: 70, tamilName: "வெங்காயம்", features: ["Fresh", "Hand Picked", "1 Kg", "Medium Size"], available: true, emoji: "🧅", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80" },
  { id: "d9", name: "Tomato", brand: "Local Farm", price: 32, category: "essentials", unit: "1 kg", stock: 48, tamilName: "தக்காளி", features: ["Farm Fresh", "Firm & Ripe", "1 Kg", "Naturally Grown"], available: true, emoji: "🍅", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80" },
  { id: "d10", name: "Potato", brand: "Local Farm", price: 30, category: "essentials", unit: "1 kg", stock: 65, tamilName: "உருளைக்கிழங்கு", features: ["Fresh", "Washed", "1 Kg", "All Purpose"], available: true, emoji: "🥔", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80" },
  { id: "d11", name: "Banana", brand: "Local Farm", price: 45, category: "essentials", unit: "1 dozen", stock: 36, tamilName: "வாழைப்பழம்", features: ["Naturally Ripened", "12 Pieces", "Rich in Potassium", "Fresh"], available: true, emoji: "🍌", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80" },
  { id: "d12", name: "Tea Powder", brand: "Red Label", price: 135, category: "essentials", unit: "500 g", stock: 28, tamilName: "தேயிலை", features: ["Strong Blend", "Rich Aroma", "500 g", "Assam Leaves"], available: true, emoji: "🍵", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80" },
  { id: "d13", name: "Marie Biscuits", brand: "Sunfeast", price: 30, category: "essentials", unit: "250 g", stock: 44, tamilName: "பிஸ்கட்", features: ["Light & Crisp", "Tea Time", "250 g", "Wheat Based"], available: true, emoji: "🍪", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80" },
  { id: "d14", name: "Sunflower Oil", brand: "Fortune", price: 155, category: "essentials", unit: "1 litre", stock: 33, tamilName: "எண்ணெய்", features: ["Refined", "Light & Healthy", "1 Litre", "Vitamin A & D"], available: true, emoji: "🫗", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { id: "d15", name: "Drinking Water Can", brand: "Bisleri", price: 70, category: "essentials", unit: "20 litre", stock: 15, tamilName: "தண்ணீர்", features: ["20 Litre", "Mineral Water", "Sealed Can", "Home Delivery"], available: true, emoji: "💧", image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&q=80" },
];

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter((p) => p.category === categoryId);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Fuzzy voice search across product names, brands, Tamil names and categories. */
export function findProductByVoice(input: string): Product | undefined {
  const q = (input || "").toLowerCase().trim();
  if (!q) return undefined;
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  let best: { p: Product; score: number } | null = null;
  for (const p of products) {
    const name = p.name.toLowerCase();
    let score = 0;
    if (name === q || p.tamilName === input.trim()) score = 1;
    else if (name.includes(q) || q.includes(name)) score = 0.95;
    else if (p.tamilName && q.includes(p.tamilName)) score = 0.95;
    else if (p.brand.toLowerCase().includes(q)) score = 0.7;
    else {
      const nameWords = name.split(/\s+/);
      const hits = words.filter((w) => nameWords.some((nw) => nw.startsWith(w) || w.startsWith(nw))).length;
      if (hits) score = hits / Math.max(words.length, 1) * 0.9;
    }
    if (!best || score > best.score) best = { p, score };
  }
  return best && best.score >= 0.45 ? best.p : undefined;
}

export function searchProducts(input: string): Product[] {
  const q = (input || "").toLowerCase().trim();
  if (!q) return [];
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.tamilName || "").includes(input.trim()) ||
      p.category.includes(q)
  );
}


export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function findCategoryByVoice(input: string): Category | undefined {
  const lower = input.toLowerCase();
  return categories.find(
    (c) =>
      lower.includes(c.id) ||
      lower.includes(c.name.toLowerCase()) ||
      (c.id === "electronics" && (lower.includes("எலக்") || lower.includes("electronic"))) ||
      (c.id === "groceries" && (lower.includes("மளிகை") || lower.includes("grocer") || lower.includes("food"))) ||
      (c.id === "personal-care" && (lower.includes("அழகு") || lower.includes("personal") || lower.includes("beauty"))) ||
      (c.id === "medicines" && (lower.includes("மருந்து") || lower.includes("medicine") || lower.includes("medical") || lower.includes("pharma"))) ||
      (c.id === "clothing" && (lower.includes("ஆடை") || lower.includes("clothing") || lower.includes("clothes") || lower.includes("dress") || lower.includes("apparel"))) ||
      (c.id === "home" && (lower.includes("வீடு") || lower.includes("home") || lower.includes("kitchen") || lower.includes("essential")))
  );
}
