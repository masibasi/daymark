import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectActiveCategories } from '@/domain/selectors';
import type { Category } from '@/domain/types';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { deltaE, hexToHsl, hslToHex } from '@/theme/color';
import { listColors, paletteForScheme } from '@/theme/palette';
import { presetHues, presetNeutrals, presetTones } from '@/theme/presetColors';
import { categoryColorKeys, categoryPalette, colors, darkColors, fontFamily, lightColors, radius, space, type } from '@/theme/tokens';
import { DayOrbit } from './DayOrbit';
import { HslSlider } from './HslSlider';
import { useT } from '@/i18n';

interface ListColorPickerProps { category: Category; style?: StyleProp<ViewStyle> }

// Custom colors stay inside a band where marks, check circles and ink text remain legible on white and on near-black.
const SAT = { min: 0.25, max: 0.95 } as const;
const LIGHT = { min: 0.38, max: 0.78 } as const;
const SIMILAR_DELTA_E = 12;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ramp = (count: number, at: (t: number) => string) => Array.from({ length: count }, (_, index) => at(index / (count - 1)));

function Swatch({ hex, label, selected, size, onPress }: { hex: string; label: string; selected: boolean; size: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.ring, { width: size, height: size }, selected && { borderColor: hex }]}>
      <View style={[styles.swatch, { width: size - 12, height: size - 12, backgroundColor: hex }]} />
    </Pressable>
  );
}

function PreviewCard({ scheme, solidHex, name }: { scheme: 'light' | 'dark'; solidHex: string; name: string }) {
  const palette = paletteForScheme(listColors({ colorKey: 'study', color: solidHex }), scheme);
  const base = scheme === 'dark' ? darkColors : lightColors;
  const segments = useMemo(() => [{ categoryId: 'preview', colors: listColors({ colorKey: 'study', color: solidHex }), share: 1, completion: 0.7 }], [solidHex]);
  return (
    <View style={[styles.preview, { backgroundColor: base.canvas, borderColor: base.line }]}>
      <View style={styles.previewRow}>
        <DayOrbit segments={segments} size={44} strokeWidth={5} scheme={scheme} />
        <View style={styles.previewChecks}>
          <View style={[styles.check, { backgroundColor: palette.solid, borderColor: palette.solid }]}><Ionicons name="checkmark" size={14} color={palette.onSolid} /></View>
          <View style={[styles.check, { borderColor: palette.solid }]} />
        </View>
      </View>
      <Text numberOfLines={1} style={[styles.previewName, { color: palette.ink, backgroundColor: palette.soft }]}>{name}</Text>
    </View>
  );
}

function CustomColor({ category, solid, onPick }: { category: Category; solid: string; onPick: (hex: string) => void }) {
  const t = useT();
  const start = useMemo(() => { const { h, s, l } = hexToHsl(solid); return { h, s: clamp(s, SAT.min, SAT.max), l: clamp(l, LIGHT.min, LIGHT.max) }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [hsl, setHsl] = useState(start);
  const set = (patch: Partial<typeof hsl>) => { const next = { ...hsl, ...patch }; setHsl(next); onPick(hslToHex(next)); };
  const hex = hslToHex(hsl);
  return (
    <View>
      <HslSlider label={t.colorPicker.hue} value={hsl.h} min={0} max={360} step={1} display={`${Math.round(hsl.h)}°`} thumbColor={hex} stops={ramp(60, (t) => hslToHex({ h: t * 360, s: hsl.s, l: hsl.l }))} onChange={(h) => set({ h })} />
      <HslSlider label={t.colorPicker.saturation} value={hsl.s * 100} min={SAT.min * 100} max={SAT.max * 100} step={1} display={`${Math.round(hsl.s * 100)}%`} thumbColor={hex} stops={ramp(24, (t) => hslToHex({ h: hsl.h, s: SAT.min + t * (SAT.max - SAT.min), l: hsl.l }))} onChange={(s) => set({ s: s / 100 })} />
      <HslSlider label={t.colorPicker.lightness} value={hsl.l * 100} min={LIGHT.min * 100} max={LIGHT.max * 100} step={1} display={`${Math.round(hsl.l * 100)}%`} thumbColor={hex} stops={ramp(24, (t) => hslToHex({ h: hsl.h, s: hsl.s, l: LIGHT.min + t * (LIGHT.max - LIGHT.min) }))} onChange={(l) => set({ l: l / 100 })} />
      <View style={styles.previews}>
        <PreviewCard scheme="light" solidHex={hex} name={category.name} />
        <PreviewCard scheme="dark" solidHex={hex} name={category.name} />
      </View>
    </View>
  );
}

// Recolor a list: 12 hues x 3 tones, neutrals and the classic twelve, or a custom HSL color with guardrails. Changes apply (and sync) immediately.
export function ListColorPicker({ category, style }: ListColorPickerProps) {
  const t = useT();
  const updateCategory = useDaymarkStore((state) => state.updateCategory);
  const categories = useDaymarkStore((state) => state.categories);
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');
  const [width, setWidth] = useState(0);
  const solid = listColors(category).solid;
  const cols = width >= 12 * 32 + 11 * 4 ? 12 : 6;
  const size = clamp(Math.floor((width - (cols - 1) * 4) / cols), 28, 36);
  const chosen = category.color?.toUpperCase();

  const pickHex = (hex: string) => updateCategory(category.id, { color: hex });
  const near = useMemo(() => {
    const others = selectActiveCategories(categories).filter((item) => item.id !== category.id).map((item) => ({ name: item.name, distance: deltaE(solid, listColors(item).solid) }));
    return others.filter((item) => item.distance < SIMILAR_DELTA_E).sort((a, b) => a.distance - b.distance)[0];
  }, [categories, category.id, solid]);

  const groups = Array.from({ length: Math.ceil(presetHues.length / cols) }, (_, index) => presetHues.slice(index * cols, (index + 1) * cols));

  return (
    <View style={style} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.tabs}>
        {(['presets', 'custom'] as const).map((item) => (
          <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabOn]}>
            <Text style={[styles.tabText, tab === item && styles.tabTextOn]}>{item === 'presets' ? t.colorPicker.presetsTab : t.colorPicker.customTab}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'presets' ? (
        <View>
          {groups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.group}>
              {presetTones.map((tone, toneIndex) => (
                <View key={tone} style={styles.swatchRow}>
                  {group.map((hue) => <Swatch key={hue.name} hex={hue.tones[toneIndex]} label={t.colorPicker.toneLabel(t.colorPicker.names[hue.name as keyof typeof t.colorPicker.names] ?? hue.label, t.colorPicker.tones[tone])} selected={chosen === hue.tones[toneIndex]} size={size} onPress={() => updateCategory(category.id, { color: hue.tones[toneIndex] })} />)}
                </View>
              ))}
            </View>
          ))}
          <View style={styles.swatchRow}>
            {presetNeutrals.map((item) => <Swatch key={item.name} hex={item.hex} label={t.colorPicker.names[item.name as keyof typeof t.colorPicker.names] ?? item.label} selected={chosen === item.hex} size={size} onPress={() => updateCategory(category.id, { color: item.hex })} />)}
          </View>
          <View style={[styles.swatchRow, styles.classic]}>
            {categoryColorKeys.map((key) => <Swatch key={key} hex={categoryPalette[key].solid} label={t.colorPicker.classic(key)} selected={!category.color && category.colorKey === key} size={size} onPress={() => updateCategory(category.id, { colorKey: key, color: null })} />)}
          </View>
        </View>
      ) : <CustomColor category={category} solid={solid} onPick={pickHex} />}
      {near ? <Text style={styles.note}>{t.colorPicker.veryClose(near.name)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: space.xxs, alignSelf: 'flex-start', padding: 3, borderRadius: radius.round, backgroundColor: colors.track, marginBottom: space.xs },
  tab: { paddingVertical: 5, paddingHorizontal: space.sm, borderRadius: radius.round },
  tabOn: { backgroundColor: colors.paper },
  tabText: { ...type.meta, color: colors.muted, fontFamily },
  tabTextOn: { color: colors.ink },
  group: { marginBottom: space.xs },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  ring: { borderRadius: radius.round, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { borderRadius: radius.round },
  classic: { marginTop: space.xxs },
  note: { ...type.meta, color: colors.muted, marginTop: space.xs, fontFamily },
  previews: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  preview: { flex: 1, minWidth: 0, padding: space.xs, gap: space.xs, borderRadius: radius.md, borderWidth: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewChecks: { flexDirection: 'row', gap: space.xs },
  check: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, alignItems: 'center', justifyContent: 'center' },
  previewName: { ...type.meta, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: space.xs, borderRadius: radius.round, overflow: 'hidden', fontFamily },
});
