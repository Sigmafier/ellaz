/* GENERATED DATA - the four print packs, frozen.
   ===========================================================================
   Do not hand-edit a board. Every sheet here came out of the game's OWN pure
   generator, seeded with `mulberry32(seedFrom("<kind>:<index>"))`, and
   `sheets.test.ts` re-derives all 18 of them from those same generators and
   compares - so a drifted board is a red test naming the sheet, not a puzzle
   that silently changed under a link somebody shared.

   WHY THE BOARDS ARE FROZEN HERE RATHER THAN GENERATED IN THE PAGE EMITTER.
   Measured 2026-09-03: `vite.config.ts` is bundled by esbuild, whose Vite
   plugin externalises every BARE specifier, so a module under `src/build/**`
   that reaches `src/games/<id>/logic.ts` pulls in that file's
   `import { shuffle } from "@shared/rng"` and the whole config fails to load
   with `Cannot find package '@shared/rng'`. Only TYPE aliases survive that
   boundary, which is why every existing `src/build` import of an aliased
   module is `import type`. Data crosses it; game code does not.

   It is also the stronger guarantee for the thing this lane promises. A link to
   sheet 3 must not rot: frozen data cannot change when a generator is tuned,
   and the test turns that tuning into a decision somebody has to make out loud.

   Cells are FLAT INDICES, row-major, and grids are strings of one character per
   cell so a 12x12 board is one line rather than twelve. */

/** One sudoku board: `puzzle` and `solution` are n*n digits, "0" = blank. */
export interface SudokuSheet {
  level: string;
  n: number;
  boxR: number;
  boxC: number;
  puzzle: string;
  solution: string;
}

/** One maze: walls as "1"/"0" per cell, and the shortest legal walk for the key. */
export interface MazeSheet {
  level: string;
  size: number;
  /** Wall between cell i and the cell to its right. Last column is never read. */
  right: string;
  /** Wall between cell i and the cell below it. Last row is never read. */
  down: string;
  /** Where the mouse starts. */
  at: number;
  home: number;
  cheese: number[];
  /** The fewest steps this board can be finished in. */
  par: number;
  /** Every square of one optimal walk, in order, `at` first and `home` last. */
  route: number[];
}

/** One word search: the letters, the list, and where each word was planted. */
export interface WordSheet {
  level: string;
  size: number;
  grid: string;
  words: string[];
  answers: Array<{ word: string; cells: number[] }>;
}

export const SUDOKU_SHEETS: SudokuSheet[] = [{"level":"kids4","n":4,"boxR":2,"boxC":2,"puzzle":"0002013412430300","solution":"3412213412434321"},
  {"level":"kids6","n":6,"boxR":2,"boxC":3,"puzzle":"050032020654400000200461001243300500","solution":"654132123654416325235461561243342516"},
  {"level":"kids6","n":6,"boxR":2,"boxC":3,"puzzle":"006120203405020640060002004200630504","solution":"546123213465325641461352154236632514"},
  {"level":"easy","n":9,"boxR":3,"boxC":3,"puzzle":"900027500000050089000810204100000058020501607000038412590070026370102905064985170","solution":"986427531412653789735819264147296358823541697659738412591374826378162945264985173"},
  {"level":"easy","n":9,"boxR":3,"boxC":3,"puzzle":"618209040025604010300158690000086039090042000580900020067000405009465070050827060","solution":"618239547925674318374158692742586139193742856586913724267391485839465271451827963"},
  {"level":"medium","n":9,"boxR":3,"boxC":3,"puzzle":"000009860000041059106200300860400700000000935900500486243050190700000020010070003","solution":"524739861387641259196285374865493712472168935931527486243856197759314628618972543"}];

export const MAZE_SHEETS: MazeSheet[] = [{"level":"easy","size":5,"right":"0000110101111110111100001","down":"0101000001000000100011111","at":8,"home":10,"cheese":[18,23],"par":8,"route":[8,13,18,23,22,21,20,15,10]},
  {"level":"easy","size":5,"right":"0000100101101110110100001","down":"0111001000000000101011111","at":20,"home":4,"cheese":[3,9],"par":10,"route":[20,15,10,5,0,1,2,3,4,9,4]},
  {"level":"medium","size":6,"right":"100011101011001001011101101111000011","down":"001100010010111010000000011000111111","at":11,"home":0,"cheese":[3,23,29],"par":20,"route":[11,17,23,29,23,17,16,15,9,10,4,3,2,1,7,8,14,13,12,6,0]},
  {"level":"medium","size":6,"right":"000001000101100101110101010111001001","down":"111110001101011010000100000000111111","at":0,"home":9,"cheese":[3,14,25],"par":30,"route":[0,1,2,3,4,5,11,10,16,17,23,29,35,34,33,27,26,32,31,25,31,32,26,20,21,15,14,13,7,8,9]},
  {"level":"hard","size":7,"right":"1001001011010111100010101011010100101100110000011","down":"0100001100111000101100101010100011001111001111111","at":31,"home":0,"cheese":[5,10,12,47],"par":45,"route":[31,30,23,24,17,18,19,20,13,12,5,4,11,10,11,4,5,12,13,20,19,18,17,24,23,30,31,38,39,40,47,46,45,44,43,42,35,36,29,28,21,22,15,8,7,0]},
  {"level":"expert","size":10,"right":"0000011001010110000100110100010110101101101000010101100010110100011101011111011111001110010100000011","down":"1001000011110010011110001010010100111101100011110001101101010101000000011001011100110011001111111111","at":8,"home":99,"cheese":[14,21,27,41,67,91],"par":70,"route":[8,7,17,16,26,27,26,16,15,5,4,14,4,3,2,12,22,21,22,32,42,41,51,50,60,70,80,90,91,90,80,70,60,50,51,41,42,32,22,12,13,23,33,43,53,54,55,56,66,76,77,67,77,76,66,56,55,54,53,63,64,74,84,94,95,96,97,98,88,89,99]}];

export const WORD_SHEETS: WordSheet[] = [{"level":"easy","size":8,"grid":"ללפתשאיכמעשרעממילפשנירכלפיוגפרואפפקורלנתווולואינןןלפןותלרעדריבהר","words":["שוקולד","עפיפון","עיפרון","תרנגול","מכונית","מלפפון"],"answers":[{"word":"מכונית","cells":[14,22,30,38,46,54]},
  {"word":"עפיפון","cells":[9,17,25,33,41,49]},
  {"word":"מלפפון","cells":[8,16,24,32,40,48]},
  {"word":"תרנגול","cells":[3,11,19,27,35,43]},
  {"word":"עיפרון","cells":[12,20,28,36,44,52]},
  {"word":"שוקולד","cells":[18,26,34,42,50,58]}]},
  {"level":"easy","size":8,"grid":"דלוקושסדעיהלנמבתפויתכקירייבייצבנפלולומוגוחגדרגןוןופפלמנלרתינוכמו","words":["סביבון","מלפפון","עפיפון","תרנגול","מכונית","שוקולד"],"answers":[{"word":"שוקולד","cells":[5,4,3,2,1,0]},
  {"word":"מכונית","cells":[62,61,60,59,58,57]},
  {"word":"סביבון","cells":[6,14,22,30,38,46]},
  {"word":"עפיפון","cells":[8,16,24,32,40,48]},
  {"word":"תרנגול","cells":[15,23,31,39,47,55]},
  {"word":"מלפפון","cells":[53,52,51,50,49,48]}]},
  {"level":"medium","size":10,"grid":"ןורפיעמלהורטורנלשאאשכתקבפואקמיטתטפקוסכאאנעווטבושועכןלויניאפפצדבביונינישוותהאדניפסןלעוקתייותפפיצמייםן","words":["אופניים","מכונית","מלפפון","סביבון","שוקולד","עפיפון","אוטובוס","עיפרון"],"answers":[{"word":"אופניים","cells":[38,48,58,68,78,88,98]},
  {"word":"אוטובוס","cells":[26,35,44,53,62,71,80]},
  {"word":"סביבון","cells":[36,45,54,63,72,81]},
  {"word":"מלפפון","cells":[6,15,24,33,42,51]},
  {"word":"עפיפון","cells":[49,59,69,79,89,99]},
  {"word":"מכונית","cells":[28,37,46,55,64,73]},
  {"word":"שוקולד","cells":[16,25,34,43,52,61]},
  {"word":"עיפרון","cells":[5,4,3,2,1,0]}]},
  {"level":"medium","size":10,"grid":"תוהתליתהבהאסורלרינמאבבמנאשוכותמיאגתהופתומבווצננמשילוטלייטאורפןותיששרקופכבםגכתמותוןופיפעאלאןרסהידתעדפ","words":["אופניים","שוקולד","אוטובוס","סביבון","מלפפון","תרנגול","עפיפון","מכונית"],"answers":[{"word":"אופניים","cells":[19,28,37,46,55,64,73]},
  {"word":"אוטובוס","cells":[32,42,52,62,72,82,92]},
  {"word":"מלפפון","cells":[40,50,60,70,80,90]},
  {"word":"עפיפון","cells":[86,85,84,83,82,81]},
  {"word":"סביבון","cells":[11,21,31,41,51,61]},
  {"word":"מכונית","cells":[18,27,36,45,54,63]},
  {"word":"תרנגול","cells":[3,13,23,33,43,53]},
  {"word":"שוקולד","cells":[48,58,68,78,88,98]}]},
  {"level":"hard","size":12,"grid":"אוטובוסהוהמזכעלדלוקושכליקעחהיסקתוהובחילמאותנחקתמאפולגהיווטחלןרגצשתןבלישווונדנליותוקאפןרהההלתבחודיתתותאופנייםפורפרראעמובשערבןופפלמזבסקהשקתתפהלהשל","words":["אוטובוס","אופניים","מלפפון","סביבון","עפיפון","קוביה","שוקולד","מכונית","עיפרון","תרנגול"],"answers":[{"word":"אופניים","cells":[101,102,103,104,105,106,107]},
  {"word":"אוטובוס","cells":[0,1,2,3,4,5,6]},
  {"word":"תרנגול","cells":[98,86,74,62,50,38]},
  {"word":"סביבון","cells":[131,118,105,92,79,66]},
  {"word":"שוקולד","cells":[20,19,18,17,16,15]},
  {"word":"עיפרון","cells":[25,37,49,61,73,85]},
  {"word":"עפיפון","cells":[120,108,96,84,72,60]},
  {"word":"מכונית","cells":[10,21,32,43,54,65]},
  {"word":"מלפפון","cells":[128,127,126,125,124,123]},
  {"word":"קוביה","cells":[45,56,67,78,89]}]},
  {"level":"hard","size":12,"grid":"יקעםתותרנגולהללעיתכןלילהמותכמיומשריאנרגשרבנלנארמןורפיעיפטמלופמוביעספותדוייסזפומועאלררמכיבכבןיוווכחפוונמלווקפאוטנטאעקנבויןוינגכהמהושצאתורהשרתקעבא","words":["עיפרון","שוקולד","ציפור","אוטובוס","מלפפון","אופניים","עפיפון","תרנגול","סביבון","מכונית"],"answers":[{"word":"אוטובוס","cells":[132,121,110,99,88,77,66]},
  {"word":"אופניים","cells":[81,68,55,42,29,16,3]},
  {"word":"עפיפון","cells":[65,76,87,98,109,120]},
  {"word":"סביבון","cells":[74,63,52,41,30,19]},
  {"word":"מלפפון","cells":[31,43,55,67,79,91]},
  {"word":"מכונית","cells":[78,89,100,111,122,133]},
  {"word":"עיפרון","cells":[53,52,51,50,49,48]},
  {"word":"שוקולד","cells":[130,118,106,94,82,70]},
  {"word":"תרנגול","cells":[6,7,8,9,10,11]},
  {"word":"ציפור","cells":[131,119,107,95,83]}]}];

/**
 * The scenes the colouring pack prints, by game id.
 *
 * AUTHORED rather than derived from the roster, and that is the point: these
 * six are the scenes that read as a PICTURE once their fills are stripped to
 * outlines - a creature, a face, a thing with a shape. A board of tiles becomes
 * a grid of empty rectangles, which is not something to colour in. Deriving the
 * list from `GAMES` would put one on a sheet the first time the roster grew.
 */
export const COLOR_SHEETS: string[] = ["coloring","frog","bees","pet","balloons","fruit"];
