/**
 * App-wide type scale (mobile tenant).
 * Prefer these tokens over raw fontSize / fontWeight numbers.
 *
 * Sized for compact mobile UI (forms, lists, tab screens).
 */
export const fontSize = {
  /** Captions, hints, secondary info */
  caption: 11,
  /** Secondary body, helper text */
  secondary: 13,
  /** Default body — main text everywhere */
  body: 14,
  /** Section titles */
  title: 16,
  /** Important titles / emphasis */
  emphasis: 18,
  /** Big numbers (rent, balances) */
  display: 24
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  /** Section titles, labels, headers */
  semibold: "600" as const,
  /** CTAs and display numbers only */
  bold: "700" as const
};

/** Cap Dynamic Type so accessibility sizes don't blow up layouts. */
export const maxFontSizeMultiplier = 1.15;

export type FontSizeToken = keyof typeof fontSize;
export type FontWeightToken = keyof typeof fontWeight;
