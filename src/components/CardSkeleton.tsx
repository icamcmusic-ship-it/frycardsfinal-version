import React from 'react';
import { motion } from 'motion/react';

export function CardSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1 }}
      className="aspect-[3/4] rounded-3xl bg-slate-200 animate-pulse shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"
    />
  );
}
