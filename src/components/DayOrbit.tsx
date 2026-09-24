import { AccessibilityInfo, Animated, Platform } from 'react-native';
import { useEffect, useId, useRef, useState } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { categoryPalette, colors } from '@/theme/tokens';

interface DayOrbitProps {
  segments: DayOrbitSegment[];
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}

export function DayOrbit({ segments, size = 42, strokeWidth = 6, animate = false }: DayOrbitProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const clipId = `liquid-${useId().replace(/:/g, '')}`;
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const complete = segments.length > 0 && segments.every((segment) => segment.completion === 1);
  const completion = segments.reduce((total, segment) => total + segment.share * segment.completion, 0);
  const innerRadius = Math.max(0, radiusValue - strokeWidth / 2 - 1.5);
  const innerTop = size / 2 - innerRadius;
  const innerBottom = size / 2 + innerRadius;
  const liquidY = complete ? innerTop - 1 : innerBottom - innerRadius * 2 * completion;
  const breathe = useRef(new Animated.Value(0)).current;
  let completedOffset = 0;

  useEffect(() => {
    if (!animate) return undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, [animate]);

  useEffect(() => {
    if (!animate || reduceMotion) return undefined;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 3200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(breathe, { toValue: 0, duration: 3600, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [animate, breathe, reduceMotion]);

  const animatedStyle = animate && !reduceMotion ? {
    transform: [
      { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1.008] }) },
      { rotate: breathe.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] }) },
    ],
  } : undefined;

  const liquidSegments = segments.filter((segment) => segment.completion > 0);
  let liquidX = size / 2 - innerRadius;

  return (
    <Animated.View accessibilityLabel={complete ? 'Completed daily mark' : 'Daily completion orbit'} style={[{ width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <ClipPath id={clipId}><Circle cx={size / 2} cy={size / 2} r={innerRadius} /></ClipPath>
        </Defs>
        {completion > 0 ? <G clipPath={`url(#${clipId})`}>
          <Path
            d={`M ${size / 2 - innerRadius - 2} ${liquidY} C ${size * 0.38} ${liquidY - size * 0.018}, ${size * 0.62} ${liquidY + size * 0.018}, ${size / 2 + innerRadius + 2} ${liquidY} L ${size} ${size} L 0 ${size} Z`}
            fill={categoryPalette[segments[0].categoryId].soft}
            opacity={0.34}
          />
          {liquidSegments.map((segment, index) => {
            const width = innerRadius * 2 * segment.share;
            const start = liquidX;
            const end = liquidX + width;
            liquidX = end;
            const angle = -Math.PI / 2 + (index / liquidSegments.length) * Math.PI * 2;
            const blobRadiusX = complete ? innerRadius * 0.82 : Math.max(width * 0.82, innerRadius * 0.34);
            const blobRadiusY = complete ? innerRadius * 0.76 : innerRadius * 0.72;
            const centerX = complete ? size / 2 + Math.cos(angle) * innerRadius * 0.28 : (start + end) / 2 + (index % 2 === 0 ? -size * 0.012 : size * 0.012);
            const centerY = complete ? size / 2 + Math.sin(angle) * innerRadius * 0.24 : liquidY + blobRadiusY + (index % 2 === 0 ? size * 0.008 : -size * 0.006);
            const color = categoryPalette[segment.categoryId].solid;
            return (
              <G key={`liquid-${segment.categoryId}`}>
                <Ellipse cx={centerX} cy={centerY} rx={blobRadiusX} ry={blobRadiusY} fill={color} opacity={complete ? 0.3 : 0.18 + segment.completion * 0.12} />
                <Ellipse cx={centerX + size * 0.018} cy={centerY - size * 0.018} rx={blobRadiusX * 0.72} ry={blobRadiusY * 0.82} fill={color} opacity={0.08} />
              </G>
            );
          })}
        </G> : null}
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} fill="none" stroke={colors.track} strokeWidth={strokeWidth} />
        {segments.map((segment) => {
          const fillDash = circumference * segment.share * segment.completion;
          const start = completedOffset;
          completedOffset += fillDash;
          const palette = categoryPalette[segment.categoryId];
          return fillDash > 0 ? (
            <Circle
              key={segment.categoryId}
              cx={size / 2} cy={size / 2} r={radiusValue} fill="none"
              stroke={palette.solid} strokeWidth={strokeWidth} strokeLinecap="butt"
              strokeDasharray={`${fillDash} ${circumference - fillDash}`}
              strokeDashoffset={-start} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ) : null;
        })}
      </Svg>
    </Animated.View>
  );
}
