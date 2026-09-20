/**
 * Optimus AI — Premium Persian Font Configuration
 *
 * Persian/Farsi typography pairing:
 *  - "YekanBakh" (variable weights) drives all body, caption, label, button, and numeric text
 *    for maximum on-screen legibility.
 *  - "Peyda" (Bold → Black) is reserved for display headings and titles,
 *    giving the interface a strong, editorial character.
 *  - "BoxFace" is preserved as a specialized English/brand role.
 *
 * J-02 Typography Semantic Roles are defined in globals.css mapping to these variables.
 */

import localFont from "next/font/local";

// ==========================================
// YEKAN BAKH — Primary body / UI typeface
// ==========================================
export const persianPrimary = localFont({
  src: [
    { path: "../../public/fonts/YekanBakhFaNum-Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/YekanBakhFaNum-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/YekanBakhFaNum-Regular.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/YekanBakhFaNum-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/YekanBakhFaNum-SemiBold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-persian-primary",
  display: "swap",
  fallback: ["Inter", "system-ui", "sans-serif"],
});

// ==========================================
// ENGLISH TITLE FONT — Brand SEO Font
// ==========================================
export const englishTitleFont = localFont({
  src: [
    { path: "../../public/fonts/BoxFace.ttf", weight: "400", style: "normal" },
  ],
  variable: "--font-english-title",
  display: "swap",
  fallback: ["Impact", "Arial Black", "sans-serif"],
});

// ==========================================
// PEYDA — Display / heading typeface (titles)
// ==========================================
export const persianDisplay = localFont({
  src: [
    { path: "../../public/fonts/Peyda-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/Peyda-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/Peyda-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../../public/fonts/Peyda-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-persian-display",
  display: "swap",
  fallback: ["Inter", "system-ui", "sans-serif"],
});
