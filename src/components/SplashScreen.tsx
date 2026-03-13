import { motion, AnimatePresence } from "framer-motion";
import { Eye } from "lucide-react";

interface Props {
  visible: boolean;
}

export default function SplashScreen({ visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            {/* Eye logo */}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px hsl(155 100% 45% / 0.3)",
                  "0 0 60px hsl(155 100% 45% / 0.6)",
                  "0 0 20px hsl(155 100% 45% / 0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-28 h-28 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center"
            >
              <Eye className="w-14 h-14 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="font-display text-2xl font-bold text-foreground text-glow"
            >
              Smart Vision Cart
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-muted-foreground"
            >
              Shop with your eyes & voice
            </motion.p>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex gap-2 mt-4"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
