// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

/**
 * Color tokens for regola.
 * 
 * Follows Apple Human Interface Guidelines (HIG):
 * - Light surface (Contributor/User): calm neutral light gray canvas (#f5f5f7) with pure white paper.
 * - Dark surface (Admin/Inverted): deep black canvas (#000000) with elevated dark paper (#1c1c1e).
 * - Text states communicate meaning; color is never the sole information carrier.
 * - Standard Apple System Fills & Materials for native depth and visual hierarchy.
 */

export interface ColorPalette {
  canvas: string;
  paper: string;
  text: string;
  secondary: string;
  tertiary: string;
  separator: string;
  separatorLight: string;
  grouped: string;
  groupedStrong: string;
  brand: string;
  focus: string;
  focusRing: string;
  error: string;
  destructive: string;
  glass: string;
  chrome: string;
  accent: string;
  accentHover: string;
  accentText: string;
  selectionBg: string;
  floatingShadow: string;
  // Apple System Fills
  fillPrimary: string;
  fillSecondary: string;
  fillTertiary: string;
  fillQuaternary: string;
  // Standard Apple Materials
  materialRegular: string;
  materialThick: string;
  materialThin: string;
  materialUltrathin: string;
}

export const lightColors: ColorPalette = {
  canvas: "#f5f5f7",
  paper: "#ffffff",
  text: "#1d1d1f",
  secondary: "#636366",
  tertiary: "#707075",
  separator: "rgba(60, 60, 67, 0.29)",
  separatorLight: "rgba(60, 60, 67, 0.18)",
  grouped: "rgba(118, 118, 128, 0.12)",
  groupedStrong: "#e5e5ea",
  brand: "#000000",
  focus: "#1d1d1f",
  focusRing: "rgba(0, 0, 0, 0.16)",
  error: "#d70015",
  destructive: "#d70015",
  glass: "rgba(245, 245, 247, 0.86)",
  chrome: "rgba(245, 245, 247, 0.92)",
  accent: "#000000",
  accentHover: "#1c1c1e",
  accentText: "#ffffff",
  selectionBg: "rgba(0, 0, 0, 0.9)",
  floatingShadow: "0 8px 28px rgba(0, 0, 0, 0.14)",
  fillPrimary: "rgba(120, 120, 128, 0.20)",
  fillSecondary: "rgba(120, 120, 128, 0.16)",
  fillTertiary: "rgba(118, 118, 128, 0.12)",
  fillQuaternary: "rgba(116, 116, 128, 0.08)",
  materialRegular: "rgba(245, 245, 247, 0.82)",
  materialThick: "rgba(255, 255, 255, 0.90)",
  materialThin: "rgba(255, 255, 255, 0.65)",
  materialUltrathin: "rgba(255, 255, 255, 0.45)",
};

export const darkColors: ColorPalette = {
  canvas: "#000000",
  paper: "#1c1c1e",
  text: "#f5f5f7",
  secondary: "#aeaeb2",
  tertiary: "#8e8e93",
  separator: "rgba(235, 235, 245, 0.28)",
  separatorLight: "rgba(235, 235, 245, 0.16)",
  grouped: "rgba(118, 118, 128, 0.28)",
  groupedStrong: "rgba(118, 118, 128, 0.46)",
  brand: "#ffffff",
  focus: "#ffffff",
  focusRing: "rgba(255, 255, 255, 0.28)",
  error: "#ff6961",
  destructive: "#ff453a",
  glass: "rgba(28, 28, 30, 0.86)",
  chrome: "rgba(28, 28, 30, 0.92)",
  accent: "#ffffff",
  accentHover: "#f2f2f7",
  accentText: "#000000",
  selectionBg: "rgba(255, 255, 255, 0.9)",
  floatingShadow: "0 8px 30px rgba(0, 0, 0, 0.42)",
  fillPrimary: "rgba(120, 120, 128, 0.36)",
  fillSecondary: "rgba(120, 120, 128, 0.30)",
  fillTertiary: "rgba(118, 118, 128, 0.22)",
  fillQuaternary: "rgba(118, 118, 128, 0.14)",
  materialRegular: "rgba(28, 28, 30, 0.82)",
  materialThick: "rgba(37, 37, 40, 0.90)",
  materialThin: "rgba(28, 28, 30, 0.65)",
  materialUltrathin: "rgba(28, 28, 30, 0.45)",
};

export const highContrastLightColors: Partial<ColorPalette> = {
  text: "#000000",
  secondary: "#303038",
  tertiary: "#50505a",
  separator: "rgba(0, 0, 0, 0.52)",
  separatorLight: "rgba(0, 0, 0, 0.34)",
  grouped: "rgba(118, 118, 128, 0.20)",
  focusRing: "rgba(0, 0, 0, 0.38)",
  fillPrimary: "rgba(120, 120, 128, 0.28)",
  fillSecondary: "rgba(120, 120, 128, 0.22)",
  fillTertiary: "rgba(118, 118, 128, 0.16)",
  fillQuaternary: "rgba(116, 116, 128, 0.10)",
};

export const highContrastDarkColors: Partial<ColorPalette> = {
  text: "#ffffff",
  secondary: "#f2f2f7",
  tertiary: "#d1d1d6",
  separator: "rgba(255, 255, 255, 0.68)",
  separatorLight: "rgba(255, 255, 255, 0.42)",
  grouped: "rgba(118, 118, 128, 0.34)",
  focusRing: "rgba(255, 255, 255, 0.42)",
  fillPrimary: "rgba(120, 120, 128, 0.44)",
  fillSecondary: "rgba(120, 120, 128, 0.36)",
  fillTertiary: "rgba(118, 118, 128, 0.28)",
  fillQuaternary: "rgba(118, 118, 128, 0.18)",
};

export const scoreColors = {
  high: "#34c759",
  medium: "#ff9500",
  low: "#ff3b30",
  darkHigh: "#30d158",
  darkMedium: "#ff9f0a",
  darkLow: "#ff453a",
};
