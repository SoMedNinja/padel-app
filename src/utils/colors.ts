/**
 * Utility for generating or picking consistent colors for players.
 */

const PALETTE = [
  "#1f77b4", // blue
  "#ff7f0e", // orange
  "#2ca02c", // green
  "#d62728", // red
  "#9467bd", // purple
  "#8c564b", // brown
  "#e377c2", // pink
  "#bcbd22", // olive
  "#17becf", // cyan
  "#3366cc",
  "#dc3912",
  "#ff9900",
  "#109618",
  "#990099",
  "#0099c6",
  "#dd4477",
  "#66aa00",
  "#b82e2e",
  "#316395",
  "#994499"
];

export const getPlayerColor = (name: string): string => {
  if (!name || name === "Gäst") return "#7f7f7f";

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
};
