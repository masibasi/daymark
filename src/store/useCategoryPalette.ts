import { selectCategoryColorKey } from '@/domain/selectors';
import type { CategoryId } from '@/domain/types';
import { categoryPalette } from '@/theme/tokens';
import { useDaymarkStore } from './useDaymarkStore';

// Resolves a list id to its palette through the list's colorKey (ids no longer equal color keys).
export function useCategoryPalette() {
  const categories = useDaymarkStore((state) => state.categories);
  return (categoryId: CategoryId) => categoryPalette[selectCategoryColorKey(categories, categoryId)];
}
