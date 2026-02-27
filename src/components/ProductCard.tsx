import { motion } from "framer-motion";
import type { Product } from "@/data/products";

interface Props {
  product: Product;
  isActive?: boolean;
  index?: number;
}

export default function ProductCard({ product, isActive, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`glass rounded-xl overflow-hidden transition-all duration-300 ${
        isActive ? "shadow-neon-lg ring-2 ring-primary/60 scale-[1.02]" : "hover:shadow-neon"
      }`}
    >
      <div className="h-36 bg-gradient-to-br from-primary/15 to-accent/25 flex items-center justify-center">
        <span className="text-6xl">{product.emoji}</span>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-display text-sm font-semibold text-foreground leading-tight truncate">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground">{product.brand}</p>
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-bold text-primary text-glow">
            ${product.price.toFixed(2)}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              product.available
                ? "bg-primary/15 text-primary"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {product.available ? "In Stock" : "Sold Out"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
