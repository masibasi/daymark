import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { DayMarkSegment } from '../domain/types';
import { categoryColors, type CategoryColorKey } from '../theme/categoryColors';
import { motion, palette } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DayMarkProps {
  segments: DayMarkSegment[];
  categoryColorOf: (categoryId: string) => CategoryColorKey;
  size?: number;
  /** Minimum share of the ring any single segment gets, so a 1-task category
   * stays legible at small sizes even amid many other categories/tasks. */
  minShare?: number;
}

const GAP_DEGREES = 6;

export function DayMark({ segments, categoryColorOf, size = 28, minShare = 0.08 }: DayMarkProps) {
  const stroke = Math.max(2.5, size * 0.12);
  const radius = size / 2 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (segments.length === 0) {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={palette.hairline}
            strokeWidth={stroke}
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  // Normalize shares with a floor so small categories stay visible.
  const floored = segments.map((s) => Math.max(s.share, minShare));
  const totalFloored = floored.reduce((a, b) => a + b, 0);
  const normalized = floored.map((s) => s / totalFloored);

  const gapTotal = GAP_DEGREES * segments.length;
  const usableDegrees = 360 - gapTotal;

  let cursor = -90; // start at top
  const arcs = segments.map((seg, i) => {
    const sweep = normalized[i] * usableDegrees;
    const start = cursor;
    cursor += sweep + GAP_DEGREES;
    return { seg, start, sweep };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G>
          {arcs.map(({ seg, start, sweep }) => {
            const colors = categoryColors[categoryColorOf(seg.categoryId)];
            return (
              <SegmentArc
                key={seg.categoryId}
                cx={center}
                cy={center}
                radius={radius}
                stroke={stroke}
                startDeg={start}
                sweepDeg={sweep}
                circumference={circumference}
                track={colors.soft}
                fillColor={colors.solid}
                fillFraction={seg.fill}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

interface SegmentArcProps {
  cx: number;
  cy: number;
  radius: number;
  stroke: number;
  startDeg: number;
  sweepDeg: number;
  circumference: number;
  track: string;
  fillColor: string;
  fillFraction: number;
}

function SegmentArc({
  cx,
  cy,
  radius,
  stroke,
  startDeg,
  sweepDeg,
  circumference,
  track,
  fillColor,
  fillFraction,
}: SegmentArcProps) {
  const segLength = (sweepDeg / 360) * circumference;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(fillFraction, { duration: motion.slow });
  }, [fillFraction, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [segLength * progress.value, circumference],
  }));

  return (
    <G transform={`rotate(${startDeg} ${cx} ${cy})`}>
      {/* Track for this segment */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={track}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={[segLength, circumference]}
        strokeLinecap="butt"
      />
      {/* Animated fill sweep */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={fillColor}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="butt"
        animatedProps={animatedProps}
      />
    </G>
  );
}
