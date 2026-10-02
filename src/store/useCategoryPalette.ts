import type { Category, CategoryId } from '@/domain/types';
import { resolveCategoryPalette, type ResolvedPalette, type Scheme } from '@/theme/palette';
import { useDaymarkStore } from './useDaymarkStore';

// Resolves a list (its id, or the Category itself) to its palette for the current scheme: custom color when set, else the colorKey preset.
export function useCategoryPalette(scheme?: Scheme) {
  const categories = useDaymarkStore((state) => state.categories);
  return (list: CategoryId | Category): ResolvedPalette => {
    const category = typeof list === 'string' ? categories.find((item) => item.id === list) : list;
    return resolveCategoryPalette(category ?? { colorKey: 'graphite' }, scheme);
  };
}
