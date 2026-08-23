/** Consistent spacing scale for mobile screens. */
export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24
} as const;

export type SpacingToken = keyof typeof spacing;

/** Minimum touch target per platform guidelines (44pt). */
export const touchTarget = 44;
