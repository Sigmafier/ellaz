import type { Locale } from "@i18n/index";
// Coloring pages as sets of SVG regions. Each region is a path the child taps to
// fill with the selected color. Original simple shapes (no third-party art).
export interface Region {
  id: string;
  d: string; // SVG path data
}
export interface Picture {
  id: string;
  name: Record<Locale, string>;
  viewBox: string;
  regions: Region[];
  // decorative outlines drawn on top (not fillable — e.g. whiskers, antennae)
  outlines?: string[];
}

// Circle idiom used throughout: "M cx cy m-r 0 a r r 0 1 0 2r 0 a r r 0 1 0 -2r 0".
// Pictures are ordered roughly simple -> detailed so the ➡ button steps up in difficulty.
export const PICTURES: Picture[] = [
  {
    id: "house",
    name: { he: "בית", en: "House" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V120 H0 Z" },
      { id: "grass", d: "M0 120 H200 V200 H0 Z" },
      { id: "roof", d: "M50 90 L100 45 L150 90 Z" },
      { id: "wall", d: "M60 90 H140 V160 H60 Z" },
      { id: "door", d: "M92 120 H112 V160 H92 Z" },
      { id: "window", d: "M68 100 H84 V116 H68 Z" },
      { id: "sun", d: "M165 30 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0" },
    ],
  },
  {
    id: "fish",
    name: { he: "דג", en: "Fish" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "water", d: "M0 0 H200 V200 H0 Z" },
      { id: "body", d: "M40 100 C40 60 120 60 140 100 C120 140 40 140 40 100 Z" },
      { id: "tail", d: "M140 100 L180 70 L180 130 Z" },
      { id: "fin", d: "M80 70 L100 45 L110 72 Z" },
      { id: "eye", d: "M60 92 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" },
    ],
  },
  {
    id: "flower",
    name: { he: "פרח", en: "Flower" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V200 H0 Z" },
      { id: "petal1", d: "M100 40 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0" },
      { id: "petal2", d: "M60 80 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0" },
      { id: "petal3", d: "M140 80 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0" },
      { id: "petal4", d: "M75 125 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0" },
      { id: "petal5", d: "M125 125 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0" },
      { id: "center", d: "M100 95 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0" },
      { id: "stem", d: "M96 150 H104 V195 H96 Z" },
    ],
  },
  {
    id: "sun_clouds",
    name: { he: "שמש ועננים", en: "Sun & Clouds" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V200 H0 Z" },
      { id: "sun", d: "M60 55 m-28 0 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0" },
      { id: "cloud1", d: "M120 70 a16 16 0 0 1 2 -30 a20 20 0 0 1 36 -4 a14 14 0 0 1 12 22 a13 13 0 0 1 -6 16 Z" },
      { id: "cloud2", d: "M50 150 a16 16 0 0 1 2 -30 a20 20 0 0 1 36 -4 a14 14 0 0 1 12 22 a13 13 0 0 1 -6 16 Z" },
      { id: "cloud3", d: "M130 165 a12 12 0 0 1 2 -22 a15 15 0 0 1 27 -3 a11 11 0 0 1 9 17 a10 10 0 0 1 -5 12 Z" },
    ],
  },
  {
    id: "balloons",
    name: { he: "בלונים", en: "Balloons" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V200 H0 Z" },
      { id: "balloon1", d: "M100 70 m-38 0 a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0" },
      { id: "string1", d: "M98 108 H102 V196 H98 Z" },
      { id: "balloon2", d: "M45 95 m-26 0 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0" },
      { id: "string2", d: "M43 121 H47 V196 H43 Z" },
      { id: "balloon3", d: "M155 90 m-28 0 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0" },
      { id: "string3", d: "M153 118 H157 V196 H153 Z" },
    ],
  },
  {
    id: "rainbow",
    name: { he: "קשת בענן", en: "Rainbow" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V200 H0 Z" },
      { id: "band1", d: "M20 175 A80 80 0 0 0 180 175 L166 175 A66 66 0 0 1 34 175 Z" },
      { id: "band2", d: "M34 175 A66 66 0 0 0 166 175 L152 175 A52 52 0 0 1 48 175 Z" },
      { id: "band3", d: "M48 175 A52 52 0 0 0 152 175 L138 175 A38 38 0 0 1 62 175 Z" },
      { id: "band4", d: "M62 175 A38 38 0 0 0 138 175 L124 175 A24 24 0 0 1 76 175 Z" },
      { id: "cloudL", d: "M20 185 a14 14 0 0 1 2 -26 a17 17 0 0 1 31 -3 a12 12 0 0 1 10 15 a11 11 0 0 1 -6 14 Z" },
      { id: "cloudR", d: "M120 185 a14 14 0 0 1 2 -26 a17 17 0 0 1 31 -3 a12 12 0 0 1 10 15 a11 11 0 0 1 -6 14 Z" },
    ],
  },
  {
    id: "tree",
    name: { he: "עץ", en: "Tree" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V130 H0 Z" },
      { id: "grass", d: "M0 130 H200 V200 H0 Z" },
      { id: "trunk", d: "M92 120 H108 V165 H92 Z" },
      { id: "foliageTop", d: "M100 58 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0" },
      { id: "foliageLeft", d: "M74 90 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0" },
      { id: "foliageRight", d: "M126 90 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0" },
      { id: "apple1", d: "M85 80 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" },
      { id: "apple2", d: "M120 100 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" },
    ],
  },
  {
    id: "car",
    name: { he: "מכונית", en: "Car" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V150 H0 Z" },
      { id: "road", d: "M0 150 H200 V200 H0 Z" },
      { id: "body", d: "M22 115 H178 V145 H22 Z" },
      { id: "roof", d: "M60 115 L75 90 L135 90 L150 115 Z" },
      { id: "window", d: "M80 95 H130 V112 H80 Z" },
      { id: "wheel1", d: "M60 148 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0" },
      { id: "wheel2", d: "M140 148 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0" },
      { id: "headlight", d: "M170 120 H178 V130 H170 Z" },
    ],
  },
  {
    id: "sailboat",
    name: { he: "סירת מפרש", en: "Sailboat" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V120 H0 Z" },
      { id: "sea", d: "M0 120 H200 V200 H0 Z" },
      { id: "hull", d: "M50 130 H150 L135 160 H65 Z" },
      { id: "mast", d: "M98 60 H102 V130 H98 Z" },
      { id: "sailBig", d: "M102 62 L102 125 L150 125 Z" },
      { id: "sailSmall", d: "M98 75 L98 125 L62 125 Z" },
      { id: "flag", d: "M102 60 L118 66 L102 72 Z" },
      { id: "sun", d: "M165 35 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0" },
    ],
  },
  {
    id: "cat",
    name: { he: "חתול", en: "Cat" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "bg", d: "M0 0 H200 V200 H0 Z" },
      { id: "earLeft", d: "M55 45 L80 80 L45 80 Z" },
      { id: "earRight", d: "M145 45 L155 80 L120 80 Z" },
      { id: "head", d: "M100 110 m-55 0 a55 55 0 1 0 110 0 a55 55 0 1 0 -110 0" },
      { id: "eyeLeft", d: "M78 100 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" },
      { id: "eyeRight", d: "M122 100 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" },
      { id: "nose", d: "M92 118 L108 118 L100 128 Z" },
    ],
    outlines: [
      "M84 122 L50 116",
      "M84 126 L50 130",
      "M116 122 L150 116",
      "M116 126 L150 130",
    ],
  },
  {
    id: "butterfly",
    name: { he: "פרפר", en: "Butterfly" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "sky", d: "M0 0 H200 V200 H0 Z" },
      { id: "wingUL", d: "M97 80 C60 50 45 75 60 95 C70 108 90 100 97 92 Z" },
      { id: "wingLL", d: "M97 95 C70 100 55 115 72 135 C82 145 96 128 97 110 Z" },
      { id: "wingUR", d: "M103 80 C140 50 155 75 140 95 C130 108 110 100 103 92 Z" },
      { id: "wingLR", d: "M103 95 C130 100 145 115 128 135 C118 145 104 128 103 110 Z" },
      { id: "body", d: "M100 86 m-6 0 a6 26 0 1 0 12 0 a6 26 0 1 0 -12 0" },
    ],
    outlines: [
      "M100 62 C96 50 90 46 86 44",
      "M100 62 C104 50 110 46 114 44",
    ],
  },
  {
    id: "rocket",
    name: { he: "חללית", en: "Rocket" },
    viewBox: "0 0 200 200",
    regions: [
      { id: "space", d: "M0 0 H200 V200 H0 Z" },
      { id: "finLeft", d: "M82 115 L60 150 L82 140 Z" },
      { id: "finRight", d: "M118 115 L140 150 L118 140 Z" },
      { id: "body", d: "M82 68 H118 V140 H82 Z" },
      { id: "nose", d: "M100 30 L118 68 L82 68 Z" },
      { id: "window", d: "M100 95 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0" },
      { id: "flame", d: "M85 140 H115 L100 185 Z" },
      { id: "star1", d: "M40 50 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0" },
      { id: "star2", d: "M160 70 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0" },
    ],
  },
];

export const PALETTE = [
  "#ff7675",
  "#fdcb6e",
  "#ffeaa7",
  "#55efc4",
  "#00cec9",
  "#74b9ff",
  "#a29bfe",
  "#fd79a8",
  "#e17055",
  "#636e72",
  "#2d3436",
  "#ffffff",
];
