export interface LevelProgress {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progressPct: number;
  totalXp: number;
}

/**
 * Calculates current level and progress from total XP.
 * Standard formula: 1000 XP per level.
 * Level 1: 0 - 999 XP
 * Level 2: 1000 - 1999 XP
 * 1200 XP => Level 2, 200/1000 progress
 */
export function calculateLevelProgress(totalXp: number): LevelProgress {
  const level = Math.floor(totalXp / 1000) + 1;
  const currentLevelMinXp = (level - 1) * 1000;
  const nextLevelMinXp = level * 1000;
  
  const currentXp = totalXp - currentLevelMinXp;
  const nextLevelXp = nextLevelMinXp - currentLevelMinXp; // Always 1000 in this formula
  const progressPct = Math.min(100, (currentXp / nextLevelXp) * 100);

  return {
    level,
    currentXp,
    nextLevelXp,
    progressPct,
    totalXp
  };
}
