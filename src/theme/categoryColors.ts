export type CategoryColorKey =
  | 'study'
  | 'career'
  | 'personal'
  | 'routine'
  | 'violet'
  | 'teal'
  | 'yellow';

export interface CategoryColorSet {
  solid: string;
  soft: string;
  text: string;
}

// Stable, meaningful category colors. Never reused for anything else in the
// app. See docs/DESIGN.md "Color" for the full rationale.
export const categoryColors: Record<CategoryColorKey, CategoryColorSet> = {
  study: { solid: '#5B8DEF', soft: '#E7EDFC', text: '#3A5FC4' },
  career: { solid: '#F0985A', soft: '#FCEBDD', text: '#C46A2E' },
  personal: { solid: '#5FBF8A', soft: '#E4F5EC', text: '#3C8F63' },
  routine: { solid: '#E88BB0', soft: '#FBE9F0', text: '#C15E86' },
  // Reserve slots for future user-added categories (unused by V0 mock data).
  violet: { solid: '#8B7FE8', soft: '#ECE9FB', text: '#5F53C4' },
  teal: { solid: '#4FB8B0', soft: '#E1F5F3', text: '#2E8A83' },
  yellow: { solid: '#E0B84A', soft: '#FBF2DD', text: '#A87E1D' },
};
