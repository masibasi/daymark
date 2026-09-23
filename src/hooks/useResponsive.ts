import { useWindowDimensions } from 'react-native';
import { breakpoints } from '../theme/tokens';

export type SizeClass = 'phone' | 'tablet' | 'desktop';

export interface Responsive {
  width: number;
  sizeClass: SizeClass;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Desktop and tablet share the left-rail nav; only phone uses bottom tabs. */
  useRail: boolean;
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  const sizeClass: SizeClass =
    width >= breakpoints.desktop ? 'desktop' : width >= breakpoints.tablet ? 'tablet' : 'phone';
  return {
    width,
    sizeClass,
    isPhone: sizeClass === 'phone',
    isTablet: sizeClass === 'tablet',
    isDesktop: sizeClass === 'desktop',
    useRail: sizeClass !== 'phone',
  };
}
