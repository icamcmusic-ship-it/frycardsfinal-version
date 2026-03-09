import React from 'react';
import { motion } from 'motion/react';

export function CardSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1 }}
      className="aspect-[2/3] rounded-xl bg-slate-200 animate-pulse shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]"
    />
  );
}
