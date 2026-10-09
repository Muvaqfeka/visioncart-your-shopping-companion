import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { speak } from "@/hooks/useSpeech";

interface Props { product: Product; isActive?: boolean; index?: number; }
export default function ProductCard({ product, isActive }: Props) {
  const { addItem } = useCart();
  const { language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true);
    try { if (await addItem(product)) speak(language === "ta" ? `${product.tamilName || product.name} கார்ட்டில் சேர்க்கப்பட்டது.` : `${product.name} added to cart.`); }
    finally { setBusy(false); }
  };
  return <article className={`border rounded-lg overflow-hidden bg-card flex flex-col h-full ${isActive ? "border-primary ring-2 ring-primary/15" : "border-border"}`}>
    <Link to={`/product/${product.id}`} className="block aspect-square bg-muted overflow-hidden" aria-label={`View ${product.name}`}><img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" /></Link>
    <div className="p-3 flex flex-col flex-1 gap-2">
      <Link to={`/product/${product.id}`} className="text-sm font-semibold leading-snug min-h-10 break-words">{language === "ta" ? product.tamilName || product.name : product.name}</Link>
      <p className="text-xs text-muted-foreground">{product.unit || product.brand}</p>
      <div className="flex items-center justify-between gap-1 mt-auto pt-1"><span className="font-bold text-sm">₹{product.price.toLocaleString("en-IN")}</span><Button variant="outline" size="sm" className="text-primary border-primary/40 px-2" onClick={add} disabled={busy || !product.available} aria-label={`Add ${product.name} to cart`}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}{product.available ? (language === "ta" ? "சேர்" : "ADD") : (language === "ta" ? "இல்லை" : "Sold out")}</Button></div>
    </div>
  </article>;
}
