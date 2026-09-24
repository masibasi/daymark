import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { categoryPalette, colors } from '@/theme/tokens';

interface DayOrbitProps {
  segments: DayOrbitSegment[];
  size?: number;
  strokeWidth?: number;
}

export function DayOrbit({ segments, size = 42, strokeWidth = 6 }: DayOrbitProps) {
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const gap = segments.length > 1 ? Math.min(circumference * 0.025, 3) : 0;
  const complete = segments.length > 0 && segments.every((segment) => segment.completion === 1);
  const innerRadius = Math.max(0, radiusValue - strokeWidth / 2 - 2);
  const innerPathRadius = innerRadius / 2;
  const innerCircumference = 2 * Math.PI * innerPathRadius;
  let offset = 0;
  let innerOffset = 0;

  return (
    <View accessibilityLabel={complete ? 'Completed daily mark' : 'Daily completion orbit'} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {complete ? segments.map((segment) => {
          const length = innerCircumference * segment.share;
          const start = innerOffset;
          innerOffset += length;
          return (
            <Circle
              key={`fill-${segment.categoryId}`}
              cx={size / 2} cy={size / 2} r={innerPathRadius}
              fill="none" stroke={categoryPalette[segment.categoryId].solid}
              strokeWidth={innerRadius} strokeDasharray={`${length} ${innerCircumference - length}`}
              strokeDashoffset={-start} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        }) : null}
        {segments.length === 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={radiusValue} fill="none" stroke={colors.track} strokeWidth={strokeWidth} />
        ) : segments.map((segment) => {
          const length = circumference * segment.share;
          const start = offset;
          offset += length;
          const palette = categoryPalette[segment.categoryId];
          const trackDash = Math.max(0, length - gap);
          const fillDash = Math.max(0, trackDash * segment.completion);
          return (
            <G key={segment.categoryId}>
              <Circle
                cx={size / 2} cy={size / 2} r={radiusValue} fill="none"
                stroke={palette.soft} strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={`${trackDash} ${circumference - trackDash}`}
                strokeDashoffset={-start} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
              {fillDash > 0 ? (
                <Circle
                  cx={size / 2} cy={size / 2} r={radiusValue} fill="none"
                  stroke={palette.solid} strokeWidth={strokeWidth} strokeLinecap="round"
                  strokeDasharray={`${fillDash} ${circumference - fillDash}`}
                  strokeDashoffset={-start} transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
