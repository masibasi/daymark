// List color presets for the picker: 12 hues x 3 tones (soft / mid / deep), plus neutrals. Choosing one stores its hex as Category.color.
// Mid tones for rose, peach, violet and blue are the owner's favourites from the icon color exploration.
export const presetTones = ['soft', 'mid', 'deep'] as const;
export type PresetTone = (typeof presetTones)[number];

export interface PresetHue { name: string; label: string; tones: [string, string, string] }

export const presetHues: PresetHue[] = [
  { name: 'rose', label: 'Rose', tones: ['#F2B0BF', '#E4859B', '#B12F4D'] },
  { name: 'peach', label: 'Peach', tones: ['#F2C8B0', '#F4A376', '#B15F2F'] },
  { name: 'amber', label: 'Amber', tones: ['#F2DCB0', '#EAC57B', '#B1862F'] },
  { name: 'yellow', label: 'Yellow', tones: ['#F2E9B0', '#EADB7B', '#B1A02F'] },
  { name: 'lime', label: 'Lime', tones: ['#D6ECB7', '#BADF86', '#79A43C'] },
  { name: 'green', label: 'Green', tones: ['#B7ECCD', '#86DFAB', '#3CA468'] },
  { name: 'teal', label: 'Teal', tones: ['#B7ECEA', '#86DFDC', '#3CA4A1'] },
  { name: 'sky', label: 'Sky', tones: ['#B0DCF2', '#7BC5EA', '#2F86B1'] },
  { name: 'blue', label: 'Blue', tones: ['#B0C4F2', '#77A4F4', '#2F56B1'] },
  { name: 'indigo', label: 'Indigo', tones: ['#B0B0F2', '#7B7BEA', '#2F2FB1'] },
  { name: 'violet', label: 'Lavender', tones: ['#C8B0F2', '#A787EB', '#5F2FB1'] },
  { name: 'pink', label: 'Pink', tones: ['#F2B0DC', '#EA7BC5', '#B12F86'] },
];

export const presetNeutrals: Array<{ name: string; label: string; hex: string }> = [
  { name: 'warmGrey', label: 'Warm grey', hex: '#A39E96' },
  { name: 'graphite', label: 'Graphite', hex: '#5E5E66' },
  { name: 'brown', label: 'Brown', hex: '#A06A42' },
];
