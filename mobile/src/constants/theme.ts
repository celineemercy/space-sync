export const Colors = {
  background: "#F3F3F3",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F3F3",
  primary: "#0E6333",
  primaryPressed: "#0B4F29",
  accent: "#0E6333",
  text: "#171717",
  textMuted: "#666666",
  border: "#D8D8D8",
  danger: "#EC1C24",
  dangerSurface: "#FDE8E9",
  warning: "#F26E21",
  warningSurface: "#FFF0E6",
  successSurface: "#E5F2EA",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const Fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
  black: "Inter_900Black",
} as const;

export const Typography = {
  display: {
    fontFamily: Fonts.black,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  headline: {
    fontFamily: Fonts.extraBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  overline: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.1,
  },
} as const;
