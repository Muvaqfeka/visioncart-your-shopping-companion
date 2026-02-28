import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { speak } from "@/hooks/useSpeech";

interface Props {
  product: Product;
  isActive?: boolean;
  index?: number;
}

export default function ProductCard({ product, isActive, index = 0 }: Props) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
    speak(`${product.name} added to cart.`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`glass rounded-xl overflow-hidden transition-all duration-300 ${
        isActive ? "shadow-neon-lg ring-2 ring-primary/60 scale-[1.02]" : "hover:shadow-neon"
      }`}
    >
      <div className="h-36 bg-gradient-to-br from-primary/10 to-accent/15 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-display text-sm font-semibold text-foreground leading-tight truncate">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground">{product.brand}</p>
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-bold text-primary text-glow">
            ₹{product.price.toLocaleString("en-IN")}
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
        {product.available && (
          <button
            onClick={handleAddToCart}
            className="w-full mt-2 glass px-3 py-2 rounded-lg text-xs font-display font-semibold text-primary hover:shadow-neon transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add to Cart
          </button>
        )}
      </div>
    </motion.div>
  );
}
