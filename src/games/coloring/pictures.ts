import type { Locale } from "@i18n/index";
// Coloring pages as sets of SVG regions. Each region is a path the child taps to
// fill with the selected color, or draws over with the brush. Original art
// (no third-party drawings), generated with correct geometry by
// scripts/gen/coloring-pictures.mjs — circles, stars and symmetric
// petals/wings are computed, not eyeballed. Add a picture there and run
// `node scripts/gen/coloring-pictures.mjs` to regenerate this file.
export interface Region {
  id: string;
  d: string; // SVG path data
}
export interface Picture {
  id: string;
  name: Record<Locale, string>;
  viewBox: string;
  regions: Region[];
  // decorative outlines drawn on top (not fillable — whiskers, waffle lines…)
  outlines?: string[];
}

// Ordered roughly simple -> detailed so stepping through them ramps up.
export const PICTURES: Picture[] = [
  {
    id: "sun",
    name: {
      he: "שמש",
      en: "Sun",
      es: "Sol"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "rays",
        d: "M153.01 89.7 L182 100 L153.01 110.3 ZM151.06 117.58 L171.01 141 L140.75 135.43 ZM135.43 140.75 L141 171.01 L117.58 151.06 ZM110.3 153.01 L100 182 L89.7 153.01 ZM82.42 151.06 L59 171.01 L64.57 140.75 ZM59.25 135.43 L28.99 141 L48.94 117.58 ZM46.99 110.3 L18 100 L46.99 89.7 ZM48.94 82.42 L28.99 59 L59.25 64.57 ZM64.57 59.25 L59 28.99 L82.42 48.94 ZM89.7 46.99 L100 18 L110.3 46.99 ZM117.58 48.94 L141 28.99 L135.43 59.25 ZM140.75 64.57 L171.01 59 L151.06 82.42 Z"
      },
      {
        id: "face",
        d: "M100 100 m-52 0 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0"
      },
      {
        id: "cheekL",
        d: "M76 108 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"
      },
      {
        id: "cheekR",
        d: "M124 108 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"
      },
      {
        id: "eyeL",
        d: "M84 90 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0"
      },
      {
        id: "eyeR",
        d: "M116 90 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0"
      }
    ],
    outlines: [
      "M82 112 Q100 130 118 112"
    ]
  },
  {
    id: "flower",
    name: {
      he: "פרח",
      en: "Flower",
      es: "Flor"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "grass",
        d: "M0 168 H200 V200 H0 Z"
      },
      {
        id: "petal1",
        d: "M100 78 C113.2 93 131.68 93 144 78 C131.68 63 113.2 63 100 78 Z"
      },
      {
        id: "petal2",
        d: "M100 78 C98.73 97.94 111.79 111.01 131.11 109.11 C133.01 89.79 119.94 76.73 100 78 Z"
      },
      {
        id: "petal3",
        d: "M100 78 C85 91.2 85 109.68 100 122 C115 109.68 115 91.2 100 78 Z"
      },
      {
        id: "petal4",
        d: "M100 78 C80.06 76.73 66.99 89.79 68.89 109.11 C88.21 111.01 101.27 97.94 100 78 Z"
      },
      {
        id: "petal5",
        d: "M100 78 C86.8 63 68.32 63 56 78 C68.32 93 86.8 93 100 78 Z"
      },
      {
        id: "petal6",
        d: "M100 78 C101.27 58.06 88.21 44.99 68.89 46.89 C66.99 66.21 80.06 79.27 100 78 Z"
      },
      {
        id: "petal7",
        d: "M100 78 C115 64.8 115 46.32 100 34 C85 46.32 85 64.8 100 78 Z"
      },
      {
        id: "petal8",
        d: "M100 78 C119.94 79.27 133.01 66.21 131.11 46.89 C111.79 44.99 98.73 58.06 100 78 Z"
      },
      {
        id: "center",
        d: "M100 78 m-19 0 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0"
      },
      {
        id: "stem",
        d: "M96 96 H104 V176 H96 Z"
      },
      {
        id: "leafL",
        d: "M96 138 C92.25 121.91 79.31 115.87 65.19 123.63 C68.32 139.44 81.26 145.47 96 138 Z"
      },
      {
        id: "leafR",
        d: "M104 150 C118.74 157.47 131.68 151.44 134.81 135.63 C120.69 127.87 107.75 133.91 104 150 Z"
      },
      {
        id: "pot",
        d: "M78 176 H122 L114 200 H86 Z"
      }
    ],
    outlines: []
  },
  {
    id: "balloons",
    name: {
      he: "בלונים",
      en: "Balloons",
      es: "Globos"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "balloon1",
        d: "M100 66 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0"
      },
      {
        id: "knot1",
        d: "M95 106 L105 106 L100 115 Z"
      },
      {
        id: "balloon2",
        d: "M46 92 m-27 0 a27 27 0 1 0 54 0 a27 27 0 1 0 -54 0"
      },
      {
        id: "knot2",
        d: "M41 119 L51 119 L46 128 Z"
      },
      {
        id: "balloon3",
        d: "M156 84 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0"
      },
      {
        id: "knot3",
        d: "M151 114 L161 114 L156 123 Z"
      }
    ],
    outlines: [
      "M100 115 q 14 30 0 85",
      "M46 128 q -14 30 0 72",
      "M156 123 q 14 30 0 77"
    ]
  },
  {
    id: "fish",
    name: {
      he: "דג",
      en: "Fish",
      es: "Pez"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "water",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "tail",
        d: "M142 100 L184 68 L178 100 L184 132 Z"
      },
      {
        id: "body",
        d: "M40 100 C40 62 118 62 146 100 C118 138 40 138 40 100 Z"
      },
      {
        id: "finTop",
        d: "M78 68 C92 44 112 46 108 72 Z"
      },
      {
        id: "finBot",
        d: "M78 132 C92 156 112 154 108 128 Z"
      },
      {
        id: "scale1",
        d: "M70 100 A18 18 0 0 1 106 100 A18 18 0 0 1 70 100 Z"
      },
      {
        id: "scale2",
        d: "M100 100 A18 18 0 0 1 136 100 A18 18 0 0 1 100 100 Z"
      },
      {
        id: "cheek",
        d: "M62 100 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0"
      },
      {
        id: "eye",
        d: "M58 92 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"
      },
      {
        id: "bub1",
        d: "M24 60 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"
      },
      {
        id: "bub2",
        d: "M38 40 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0"
      },
      {
        id: "bub3",
        d: "M20 34 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0"
      }
    ],
    outlines: [
      "M58 92 m-3 -1 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"
    ]
  },
  {
    id: "butterfly",
    name: {
      he: "פרפר",
      en: "Butterfly",
      es: "Mariposa"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "wingUL",
        d: "M98 92 C58 40 30 66 40 96 C46 116 78 112 98 100 Z"
      },
      {
        id: "wingLL",
        d: "M98 104 C64 118 44 140 64 164 C82 182 96 150 98 122 Z"
      },
      {
        id: "wingUR",
        d: "M102 92 C142 40 170 66 160 96 C154 116 122 112 102 100 Z"
      },
      {
        id: "wingLR",
        d: "M102 104 C136 118 156 140 136 164 C118 182 104 150 102 122 Z"
      },
      {
        id: "spotUL",
        d: "M62 78 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"
      },
      {
        id: "spotUR",
        d: "M138 78 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"
      },
      {
        id: "spotLL",
        d: "M74 146 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"
      },
      {
        id: "spotLR",
        d: "M126 146 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"
      },
      {
        id: "body",
        d: "M100 108 m-7 0 a7 34 0 1 0 14 0 a7 34 0 1 0 -14 0"
      },
      {
        id: "head",
        d: "M100 68 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"
      }
    ],
    outlines: [
      "M96 60 C90 46 84 42 78 40",
      "M104 60 C110 46 116 42 122 40",
      "M78 40 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0",
      "M122 40 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"
    ]
  },
  {
    id: "house",
    name: {
      he: "בית",
      en: "House",
      es: "Casa"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V128 H0 Z"
      },
      {
        id: "grass",
        d: "M0 128 H200 V200 H0 Z"
      },
      {
        id: "sun",
        d: "M168 34 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0"
      },
      {
        id: "cloud",
        d: "M34 44 a13 13 0 0 1 3 -24 a17 17 0 0 1 30 -2 a12 12 0 0 1 8 20 Z"
      },
      {
        id: "wall",
        d: "M54 96 H146 V162 H54 Z"
      },
      {
        id: "roof",
        d: "M46 96 L100 52 L154 96 Z"
      },
      {
        id: "chimney",
        d: "M124 60 H138 V80 H124 Z"
      },
      {
        id: "door",
        d: "M88 120 H112 V162 H88 Z"
      },
      {
        id: "winL",
        d: "M64 108 H82 V126 H64 Z"
      },
      {
        id: "winR",
        d: "M118 108 H136 V126 H118 Z"
      },
      {
        id: "path",
        d: "M92 162 L108 162 L118 200 L82 200 Z"
      },
      {
        id: "trunk",
        d: "M20 150 H30 V178 H20 Z"
      },
      {
        id: "leaves",
        d: "M25 138 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0"
      }
    ],
    outlines: [
      "M100 120 V162",
      "M88 141 H112",
      "M73 108 V126",
      "M127 108 V126",
      "M96 120 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"
    ]
  },
  {
    id: "tree",
    name: {
      he: "עץ",
      en: "Tree",
      es: "Árbol"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V134 H0 Z"
      },
      {
        id: "grass",
        d: "M0 134 H200 V200 H0 Z"
      },
      {
        id: "trunk",
        d: "M90 116 C88 140 88 150 86 176 H114 C112 150 112 140 110 116 Z"
      },
      {
        id: "leafTop",
        d: "M100 58 m-36 0 a36 36 0 1 0 72 0 a36 36 0 1 0 -72 0"
      },
      {
        id: "leafL",
        d: "M70 92 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0"
      },
      {
        id: "leafR",
        d: "M130 92 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0"
      },
      {
        id: "leafC",
        d: "M100 96 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0"
      },
      {
        id: "apple1",
        d: "M86 66 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"
      },
      {
        id: "apple2",
        d: "M118 62 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"
      },
      {
        id: "apple3",
        d: "M74 100 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"
      },
      {
        id: "apple4",
        d: "M128 104 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"
      },
      {
        id: "apple5",
        d: "M100 84 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"
      }
    ],
    outlines: [
      "M86 58 q3 -5 6 -6",
      "M118 54 q3 -5 6 -6",
      "M74 92 q3 -5 6 -6",
      "M128 96 q3 -5 6 -6",
      "M100 76 q3 -5 6 -6"
    ]
  },
  {
    id: "car",
    name: {
      he: "מכונית",
      en: "Car",
      es: "Coche"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V150 H0 Z"
      },
      {
        id: "road",
        d: "M0 150 H200 V200 H0 Z"
      },
      {
        id: "body",
        d: "M18 118 Q18 138 30 140 H170 Q182 138 182 118 L166 116 H34 Z"
      },
      {
        id: "cabin",
        d: "M58 116 L74 88 H126 L142 116 Z"
      },
      {
        id: "winL",
        d: "M70 112 L82 92 L97 92 L97 112 Z"
      },
      {
        id: "winR",
        d: "M103 112 L103 92 L118 92 L130 112 Z"
      },
      {
        id: "wheelL",
        d: "M62 148 m-17 0 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0"
      },
      {
        id: "wheelR",
        d: "M138 148 m-17 0 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0"
      },
      {
        id: "hubL",
        d: "M62 148 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"
      },
      {
        id: "hubR",
        d: "M138 148 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"
      },
      {
        id: "headlight",
        d: "M174 124 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0"
      },
      {
        id: "door",
        d: "M100 116 V140 H98 V116 Z"
      }
    ],
    outlines: [
      "M18 150 H182"
    ]
  },
  {
    id: "rocket",
    name: {
      he: "חללית",
      en: "Rocket",
      es: "Cohete"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "space",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "planet",
        d: "M46 48 m-20 0 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0"
      },
      {
        id: "flame",
        d: "M85 148 Q100 210 115 148 Z"
      },
      {
        id: "flameIn",
        d: "M92 148 Q100 186 108 148 Z"
      },
      {
        id: "finL",
        d: "M80 118 L56 156 L80 144 Z"
      },
      {
        id: "finR",
        d: "M120 118 L144 156 L120 144 Z"
      },
      {
        id: "body",
        d: "M80 66 Q80 60 84 60 H116 Q120 60 120 66 V148 H80 Z"
      },
      {
        id: "nose",
        d: "M100 22 Q120 46 116 66 H84 Q80 46 100 22 Z"
      },
      {
        id: "window",
        d: "M100 92 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0"
      },
      {
        id: "star1",
        d: "M150 32 L152 37.25 L157.61 37.53 L153.23 41.05 L154.7 46.47 L150 43.4 L145.3 46.47 L146.77 41.05 L142.39 37.53 L148 37.25 Z"
      },
      {
        id: "star2",
        d: "M166 82 L168 87.25 L173.61 87.53 L169.23 91.05 L170.7 96.47 L166 93.4 L161.3 96.47 L162.77 91.05 L158.39 87.53 L164 87.25 Z"
      },
      {
        id: "star3",
        d: "M40 112 L42 117.25 L47.61 117.53 L43.23 121.05 L44.7 126.47 L40 123.4 L35.3 126.47 L36.77 121.05 L32.39 117.53 L38 117.25 Z"
      },
      {
        id: "star4",
        d: "M160 142 L162 147.25 L167.61 147.53 L163.23 151.05 L164.7 156.47 L160 153.4 L155.3 156.47 L156.77 151.05 L152.39 147.53 L158 147.25 Z"
      },
      {
        id: "star5",
        d: "M30 160 L32 165.25 L37.61 165.53 L33.23 169.05 L34.7 174.47 L30 171.4 L25.3 174.47 L26.77 169.05 L22.39 165.53 L28 165.25 Z"
      }
    ],
    outlines: [
      "M100 92 m-15 0 a15 15 0 0 1 8 -13"
    ]
  },
  {
    id: "sailboat",
    name: {
      he: "סירת מפרש",
      en: "Sailboat",
      es: "Velero"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V116 H0 Z"
      },
      {
        id: "sun",
        d: "M164 36 m-17 0 a17 17 0 1 0 34 0 a17 17 0 1 0 -34 0"
      },
      {
        id: "cloud",
        d: "M30 40 a12 12 0 0 1 3 -22 a16 16 0 0 1 28 -2 a11 11 0 0 1 7 18 Z"
      },
      {
        id: "sea",
        d: "M0 116 H200 V200 H0 Z"
      },
      {
        id: "hull",
        d: "M44 148 H156 L138 178 H62 Z"
      },
      {
        id: "sailBig",
        d: "M104 44 V140 H158 Z"
      },
      {
        id: "sailSmall",
        d: "M96 62 V140 H52 Z"
      },
      {
        id: "flag",
        d: "M104 40 L128 48 L104 56 Z"
      }
    ],
    outlines: [
      "M100 40 V140",
      "M0 132 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0"
    ]
  },
  {
    id: "rainbow",
    name: {
      he: "קשת בענן",
      en: "Rainbow",
      es: "Arcoíris"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "sky",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "band1",
        d: "M8 176 A92 92 0 0 1 192 176 L180 176 A80 80 0 0 0 20 176 Z"
      },
      {
        id: "band2",
        d: "M20 176 A80 80 0 0 1 180 176 L168 176 A68 68 0 0 0 32 176 Z"
      },
      {
        id: "band3",
        d: "M32 176 A68 68 0 0 1 168 176 L156 176 A56 56 0 0 0 44 176 Z"
      },
      {
        id: "band4",
        d: "M44 176 A56 56 0 0 1 156 176 L144 176 A44 44 0 0 0 56 176 Z"
      },
      {
        id: "band5",
        d: "M56 176 A44 44 0 0 1 144 176 L132 176 A32 32 0 0 0 68 176 Z"
      },
      {
        id: "band6",
        d: "M68 176 A32 32 0 0 1 132 176 L120 176 A20 20 0 0 0 80 176 Z"
      },
      {
        id: "cloudL",
        d: "M8 190 a15 15 0 0 1 3 -28 a20 20 0 0 1 36 -3 a13 13 0 0 1 9 18 Z"
      },
      {
        id: "cloudR",
        d: "M136 190 a15 15 0 0 1 3 -28 a20 20 0 0 1 36 -3 a13 13 0 0 1 9 18 Z"
      },
      {
        id: "sun",
        d: "M100 168 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0"
      }
    ],
    outlines: []
  },
  {
    id: "cat",
    name: {
      he: "חתול",
      en: "Cat",
      es: "Gato"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "bg",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "tail",
        d: "M150 176 C192 168 190 116 158 122 C176 132 168 156 146 158 Z"
      },
      {
        id: "body",
        d: "M58 182 C50 132 72 116 100 116 C128 116 150 132 142 182 Z"
      },
      {
        id: "belly",
        d: "M82 182 C78 150 88 138 100 138 C112 138 122 150 118 182 Z"
      },
      {
        id: "earL",
        d: "M58 46 L86 74 L50 78 Z"
      },
      {
        id: "earR",
        d: "M142 46 L150 78 L114 74 Z"
      },
      {
        id: "earLin",
        d: "M62 56 L78 72 L58 74 Z"
      },
      {
        id: "earRin",
        d: "M138 56 L142 74 L122 72 Z"
      },
      {
        id: "head",
        d: "M100 84 m-42 0 a42 42 0 1 0 84 0 a42 42 0 1 0 -84 0"
      },
      {
        id: "eyeL",
        d: "M84 80 m-9 0 a9 12 0 1 0 18 0 a9 12 0 1 0 -18 0"
      },
      {
        id: "eyeR",
        d: "M116 80 m-9 0 a9 12 0 1 0 18 0 a9 12 0 1 0 -18 0"
      },
      {
        id: "muzzle",
        d: "M100 104 m-20 0 a20 12 0 1 0 40 0 a20 12 0 1 0 -40 0"
      },
      {
        id: "nose",
        d: "M93 98 L107 98 L100 106 Z"
      }
    ],
    outlines: [
      "M84 82 m-4 -2 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0",
      "M116 82 m-4 -2 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0",
      "M100 106 V114",
      "M100 114 q-8 6 -16 2",
      "M100 114 q8 6 16 2",
      "M78 100 L48 92",
      "M78 106 L48 110",
      "M122 100 L152 92",
      "M122 106 L152 110"
    ]
  },
  {
    id: "dog",
    name: {
      he: "כלב",
      en: "Dog",
      es: "Perro"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "bg",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "tail",
        d: "M150 168 C180 150 178 120 156 130 C170 140 160 154 146 156 Z"
      },
      {
        id: "body",
        d: "M60 184 C52 138 74 124 100 124 C126 124 148 138 140 184 Z"
      },
      {
        id: "legL",
        d: "M78 168 H92 V190 H78 Z"
      },
      {
        id: "legR",
        d: "M108 168 H122 V190 H108 Z"
      },
      {
        id: "earL",
        d: "M56 66 C34 78 34 118 58 118 C70 118 70 92 70 78 Z"
      },
      {
        id: "earR",
        d: "M144 66 C166 78 166 118 142 118 C130 118 130 92 130 78 Z"
      },
      {
        id: "head",
        d: "M100 86 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0"
      },
      {
        id: "spot",
        d: "M100 66 C82 66 78 92 92 96 C104 99 118 84 112 72 Z"
      },
      {
        id: "snout",
        d: "M100 108 m-24 0 a24 16 0 1 0 48 0 a24 16 0 1 0 -48 0"
      },
      {
        id: "nose",
        d: "M100 100 m-9 0 a9 7 0 1 0 18 0 a9 7 0 1 0 -18 0"
      },
      {
        id: "eyeL",
        d: "M84 80 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"
      },
      {
        id: "eyeR",
        d: "M116 80 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"
      },
      {
        id: "tongue",
        d: "M94 116 H106 V128 Q100 134 94 128 Z"
      }
    ],
    outlines: [
      "M100 107 V116"
    ]
  },
  {
    id: "icecream",
    name: {
      he: "גלידה",
      en: "Ice cream",
      es: "Helado"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "bg",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "cone",
        d: "M74 118 L126 118 L100 190 Z"
      },
      {
        id: "scoop1",
        d: "M100 108 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0"
      },
      {
        id: "scoop2",
        d: "M78 82 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0"
      },
      {
        id: "scoop3",
        d: "M122 82 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0"
      },
      {
        id: "scoopTop",
        d: "M100 62 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0"
      },
      {
        id: "cherry",
        d: "M100 34 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0"
      }
    ],
    outlines: [
      "M100 24 Q108 12 118 12",
      "M84 118 L100 150",
      "M100 118 L100 150",
      "M116 118 L100 150",
      "M80 132 L120 132",
      "M86 150 L114 150",
      "M86 70 l6 4",
      "M112 66 l6 4",
      "M100 92 l6 4",
      "M74 96 l6 4",
      "M124 94 l6 4"
    ]
  },
  {
    id: "cupcake",
    name: {
      he: "קאפקייק",
      en: "Cupcake",
      es: "Magdalena"
    },
    viewBox: "0 0 200 200",
    regions: [
      {
        id: "bg",
        d: "M0 0 H200 V200 H0 Z"
      },
      {
        id: "plate",
        d: "M36 188 Q100 204 164 188 Q150 176 100 176 Q50 176 36 188 Z"
      },
      {
        id: "wrapper",
        d: "M60 124 H140 L130 176 H70 Z"
      },
      {
        id: "frostBot",
        d: "M54 128 C54 102 78 92 100 92 C122 92 146 102 146 128 C118 136 82 136 54 128 Z"
      },
      {
        id: "frostMid",
        d: "M66 106 C66 82 86 72 100 72 C114 72 134 82 134 106 C110 114 90 114 66 106 Z"
      },
      {
        id: "frostTop",
        d: "M80 86 C80 64 92 54 100 54 C108 54 120 64 120 86 C106 92 94 92 80 86 Z"
      },
      {
        id: "cherry",
        d: "M100 44 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0"
      }
    ],
    outlines: [
      "M100 34 Q112 22 122 24",
      "M76 124 V176",
      "M92 124 L88 176",
      "M108 124 L112 176",
      "M124 124 V176",
      "M84 112 l5 5",
      "M118 108 l-5 5",
      "M96 96 l4 5",
      "M104 118 l4 4"
    ]
  }
];

export const PALETTE = [
  "#ff5b5b",
  "#ff8a5b",
  "#ffab3d",
  "#ffd23d",
  "#ffe95b",
  "#c6e64f",
  "#6ecb57",
  "#2fb59a",
  "#37c6d0",
  "#4aa3ff",
  "#5c6ce0",
  "#a061e0",
  "#e857a6",
  "#ff9ec4",
  "#a9744f",
  "#e0b585",
  "#ffd9bf",
  "#9aa7b0",
  "#3a4a54",
  "#ffffff",
];
