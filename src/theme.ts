export const colors = {
  ink: '#1B1340',
  backdrop: '#CDB9FF',
  white: '#FFFFFF',
  tomato: '#FF5A4F',
  sun: '#FFC933',
  mint: '#3DDC97',
  sky: '#4CC9F0',
  bubblegum: '#FF8FD0',
  grape: '#B38CFF',
  orange: '#FF9F1C',
  muted: '#5B4F94',
};

export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semi: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};

const UNIT_COLORS = [
  colors.tomato,
  colors.sun,
  colors.mint,
  colors.sky,
  colors.bubblegum,
  colors.orange,
  colors.grape,
];
const TILTS = [-1.5, 1, -0.8, 1.6, -1.2];

export function stickerColor(id: number): string {
  return UNIT_COLORS[id % UNIT_COLORS.length];
}

export function tiltFor(index: number): number {
  return TILTS[index % TILTS.length];
}
