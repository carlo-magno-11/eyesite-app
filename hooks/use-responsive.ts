import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isPhone = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1440;

  const propertyColumns = isPhone ? 1 : isTablet ? 2 : isLargeDesktop ? 4 : 3;
  const horizontalPadding = isPhone ? 16 : isTablet ? 24 : 32;
  const contentMaxWidth = isLargeDesktop ? 1400 : isDesktop ? 1200 : undefined;

  return {
    width,
    height,
    isPhone,
    isTablet,
    isDesktop,
    isLargeDesktop,
    propertyColumns,
    horizontalPadding,
    contentMaxWidth,
  };
}
