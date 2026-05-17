const PALETTE = [
  '#E53935', // red
  '#8E24AA', // purple
  '#1E88E5', // blue
  '#00897B', // teal
  '#43A047', // green
  '#F4511E', // deep orange
  '#6D4C41', // brown
  '#00ACC1', // cyan
  '#7CB342', // light green
  '#FB8C00', // orange
  '#3949AB', // indigo
  '#D81B60', // pink
];

export function getBrandColor(initial: string): string {
  let hash = 0;
  for (let i = 0; i < initial.length; i++) {
    hash = (hash * 31 + initial.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
