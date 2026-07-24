import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";

export function MagicLoader({ message = "Weaving magic..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative w-32 h-32 mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 flex items-center justify-center text-primary/20"
        >
          <Star className="w-24 h-24" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center text-primary"
        >
          <Sparkles className="w-12 h-12" />
        </motion.div>
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-accent' : 'bg-primary'}`}
            initial={{ x: 60, y: 60, opacity: 0 }}
            animate={{ 
              y: [60, -40 + Math.random() * 20], 
              x: [60, (i - 2.5) * 30 + 60],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
      <motion.h3 
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-3xl font-serif text-foreground font-medium"
      >
        {message}
      </motion.h3>
      <p className="text-muted-foreground mt-4 font-sans text-lg max-w-sm">
        Gathering stardust and turning pages. This will just take a few moments...
      </p>
    </div>
  );
}
