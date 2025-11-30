import { LexoRank } from 'lexorank';

// =============================================================================
// LEXORANK UTILITIES
// =============================================================================

/**
 * Generate an initial rank for a new item
 * Uses the middle of the rank space to leave room for insertions
 */
export function generateInitialRank(): string {
  return LexoRank.middle().toString();
}

/**
 * Generate a rank for inserting at the beginning of a list
 * @param firstRank - The current first item's rank (or undefined if list is empty)
 */
export function generateRankBefore(firstRank?: string | null): string {
  if (!firstRank) {
    return LexoRank.middle().toString();
  }
  
  const rank = LexoRank.parse(firstRank);
  return rank.genPrev().toString();
}

/**
 * Generate a rank for inserting at the end of a list
 * @param lastRank - The current last item's rank (or undefined if list is empty)
 */
export function generateRankAfter(lastRank?: string | null): string {
  if (!lastRank) {
    return LexoRank.middle().toString();
  }
  
  const rank = LexoRank.parse(lastRank);
  return rank.genNext().toString();
}

/**
 * Generate a rank for inserting between two existing items
 * @param prevRank - The rank of the item that will be before the new item
 * @param nextRank - The rank of the item that will be after the new item
 */
export function generateRankBetween(
  prevRank?: string | null, 
  nextRank?: string | null
): string {
  // Both null - return middle
  if (!prevRank && !nextRank) {
    return LexoRank.middle().toString();
  }
  
  // Only prev exists - generate after
  if (prevRank && !nextRank) {
    return generateRankAfter(prevRank);
  }
  
  // Only next exists - generate before
  if (!prevRank && nextRank) {
    return generateRankBefore(nextRank);
  }
  
  // Both exist - generate between
  const prev = LexoRank.parse(prevRank!);
  const next = LexoRank.parse(nextRank!);
  return prev.between(next).toString();
}

/**
 * Generate ranks for multiple items to be inserted
 * Useful for bulk operations or initial seeding
 * @param count - Number of ranks to generate
 * @param beforeRank - Optional rank that all items should come before
 * @param afterRank - Optional rank that all items should come after
 */
export function generateRanks(
  count: number,
  afterRank?: string | null,
  beforeRank?: string | null
): string[] {
  if (count <= 0) return [];
  
  const ranks: string[] = [];
  
  // Determine starting point
  let currentRank: LexoRank;
  
  if (afterRank && beforeRank) {
    // Insert between two ranks
    currentRank = LexoRank.parse(afterRank);
    const endRank = LexoRank.parse(beforeRank);
    
    // Generate evenly spaced ranks
    for (let i = 0; i < count; i++) {
      currentRank = currentRank.between(endRank);
      ranks.push(currentRank.toString());
    }
  } else if (afterRank) {
    // Insert after a rank
    currentRank = LexoRank.parse(afterRank);
    for (let i = 0; i < count; i++) {
      currentRank = currentRank.genNext();
      ranks.push(currentRank.toString());
    }
  } else if (beforeRank) {
    // Insert before a rank (generate in reverse, then reverse array)
    currentRank = LexoRank.parse(beforeRank);
    for (let i = 0; i < count; i++) {
      currentRank = currentRank.genPrev();
      ranks.unshift(currentRank.toString());
    }
  } else {
    // No bounds - start from middle
    currentRank = LexoRank.middle();
    ranks.push(currentRank.toString());
    
    for (let i = 1; i < count; i++) {
      currentRank = currentRank.genNext();
      ranks.push(currentRank.toString());
    }
  }
  
  return ranks;
}

/**
 * Compare two ranks
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareRanks(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1; // nulls go to the end
  if (!b) return -1;
  
  const rankA = LexoRank.parse(a);
  const rankB = LexoRank.parse(b);
  
  return rankA.compareTo(rankB);
}

/**
 * Check if a rank is valid LexoRank format
 */
export function isValidRank(rank: string): boolean {
  try {
    LexoRank.parse(rank);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a list of ranks to be evenly spaced
 * Use this when ranks have become too compressed (many items between two close ranks)
 * Returns new ranks in the same order
 */
export function normalizeRanks(count: number): string[] {
  if (count <= 0) return [];
  
  // Generate fresh, evenly spaced ranks from the beginning of the bucket
  const ranks: string[] = [];
  let current = LexoRank.min();
  
  for (let i = 0; i < count; i++) {
    ranks.push(current.toString());
    current = current.genNext();
  }
  
  return ranks;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface RankInfo {
  rank: string;
  position: number;
}

export interface ReorderResult {
  itemId: string;
  newRank: string;
  previousRank: string | null;
}
