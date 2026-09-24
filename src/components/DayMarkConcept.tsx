import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { DayOrbit } from './DayOrbit';
import { colors } from '@/theme/tokens';

export type DayMarkVariant = 'pastel' | 'glass' | 'wash' | 'current';

interface Props { variant: DayMarkVariant; segments: DayOrbitSegment[]; size?: number }

const pigment = ['#AAB9FA', '#F8A8BF', '#8DDBC0', '#C9A8F2'];
const bright = ['#6684F0', '#F27698', '#38BA8C', '#A774E6'];

export function DayMarkConcept({ variant, segments, size = 90 }: Props) {
  const id = `mark-${useId().replace(/:/g, '')}`;
  if (variant === 'current') return <DayOrbit segments={segments} size={size} strokeWidth={size * 0.095} />;

  const center = size / 2;
  const radius = size * (variant === 'glass' ? 0.34 : 0.38);
  const strokeWidth = size * (variant === 'glass' ? 0.16 : variant === 'wash' ? 0.13 : 0.105);
  const circumference = 2 * Math.PI * radius;
  const completion = segments.reduce((sum, segment) => sum + segment.share * segment.completion, 0);
  let offset = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={`${variant} day mark, ${Math.round(completion * 100)} percent complete`}>
      <Defs>
        <LinearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.92" />
          <Stop offset="0.42" stopColor="#D7DFF8" stopOpacity="0.66" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.96" />
        </LinearGradient>
        <LinearGradient id={`${id}-wave`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#CAD4FC" stopOpacity="0.52" />
          <Stop offset="0.55" stopColor="#F8C6D5" stopOpacity="0.42" />
          <Stop offset="1" stopColor="#A4E3CE" stopOpacity="0.45" />
        </LinearGradient>
      </Defs>
      {variant === 'glass' ? (
        <G>
          <Circle cx={center} cy={center} r={radius + strokeWidth * 0.15} fill="none" stroke={colors.line} strokeWidth={strokeWidth + size * 0.045} opacity={0.55} />
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={`url(#${id}-glass)`} strokeWidth={strokeWidth} />
          {completion > 0 ? <Circle cx={center} cy={center} r={radius - strokeWidth * 0.68} fill={`url(#${id}-wave)`} opacity={completion * 0.42} /> : null}
        </G>
      ) : <Circle cx={center} cy={center} r={radius} fill="none" stroke={variant === 'wash' ? '#EDEBF2' : colors.track} strokeWidth={strokeWidth} />}
      {variant === 'wash' && completion > 0 ? segments.map((segment, index) => segment.completion > 0 ? (
        <G key={segment.categoryId}>
          <Ellipse cx={center + Math.cos(index * 1.8) * radius * 0.25} cy={center + Math.sin(index * 1.8) * radius * 0.26} rx={radius * 0.56} ry={radius * 0.46} fill={pigment[index]} opacity={completion * 0.18} />
          <Ellipse cx={center + Math.cos(index * 1.8) * radius * 0.28} cy={center + Math.sin(index * 1.8) * radius * 0.22} rx={radius * 0.34} ry={radius * 0.29} fill={pigment[index]} opacity={completion * 0.1} />
        </G>
      ) : null) : null}
      {segments.map((segment, index) => {
        const length = circumference * segment.share * segment.completion;
        const start = offset;
        offset += length;
        if (length <= 0) return null;
        return <Circle key={segment.categoryId} cx={center} cy={center} r={radius} fill="none" stroke={variant === 'pastel' ? pigment[index] : variant === 'glass' ? bright[index] : pigment[index]} strokeOpacity={variant === 'glass' ? 0.58 : 1} strokeWidth={strokeWidth} strokeLinecap="butt" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`} />;
      })}
      {variant === 'glass' ? <Path d={`M ${center - radius * 0.8} ${center - radius * 0.95} C ${center - radius * 0.2} ${center - radius * 1.3}, ${center + radius * 0.16} ${center - radius * 1.25}, ${center + radius * 0.6} ${center - radius * 1.04}`} fill="none" stroke="#FFFFFF" strokeWidth={size * 0.024} strokeLinecap="round" opacity={0.8} /> : null}
    </Svg>
  );
}
