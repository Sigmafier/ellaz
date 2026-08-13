/* Turning the card SVG into a PNG a chat app will accept - the BROWSER half.
   ===========================================================================

   `src/build/ogImages.ts` does this job at build time with satori and resvg.
   Neither exists here: both are native Node packages, and one of them alone is
   larger than this app's entire first visit. The browser already owns a text
   shaper, a bidi implementation and a rasteriser, so the whole job is: hand an
   `<img>` an SVG, draw it to a canvas, ask the canvas for PNG bytes.

   FOUR THINGS THAT MAKE THIS FAIL SILENTLY, all of them handled below:

   1. A TAINTED CANVAS. `toBlob` throws a SecurityError on a canvas that has
      drawn anything cross-origin. An SVG from a blob: URL with no external
      references does not taint - which is the other reason `shareCard.ts` may
      not reference a webfont, quite apart from the no-network rule.
   2. A LEAKED OBJECT URL. `createObjectURL` pins the blob for the life of the
      document. A sheet opened repeatedly would hold every card it ever drew.
   3. AN `<img>` THAT NEVER SETTLES. A malformed SVG fires `onerror`; a decoder
      that simply never answers fires neither. The timeout is what stops a share
      button spinning for the rest of the session.
   4. `toBlob` ANSWERING `null`. It is allowed to, and the signature says so.
      Treated as a failure rather than dereferenced.

   NOTHING HERE THROWS. A card that cannot be drawn resolves to `null`, and the
   sheet then offers the link on its own and SAYS SO - same discipline as
   `speech.ts` and `analytics.ts`, and the reason is the same: a picture is an
   enrichment, and an enrichment must never break the thing it enriches. */

/** Long enough for a phone under load, short enough that nobody stares. */
const DECODE_TIMEOUT_MS = 6000;

/** Where a chat app stops being happy. Same ceiling `ogCard.ts` names, and for
 *  the same reason: over it, WhatsApp drops the picture without saying so. */
export const CARD_MAX_BYTES = 600 * 1024;

/** Is there enough of a browser here to draw anything at all? */
export function canRenderCard(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.toBlob === "function"
  );
}

/** Decode an SVG string into an image, or `null`. Never rejects. */
function decode(svg: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let url = "";
    try {
      // A blob: URL rather than a data: URL. A data: URL has to carry the whole
      // document percent-encoded or base64'd, and `btoa` throws outright on the
      // Hebrew in every one of these cards.
      url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    } catch {
      resolve(null);
      return;
    }

    const img = new Image();
    let settled = false;
    const finish = (value: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Revoked on EVERY path, including the timeout - the path where the
      // decoder never answers is exactly the one that would leak forever.
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* nothing to do, and nothing worth failing a share over */
      }
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), DECODE_TIMEOUT_MS);

    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = url;
  });
}

/**
 * The card, as PNG bytes. `null` for every failure, including "this is not a
 * browser".
 */
export async function renderCardPng(svg: string, size: number): Promise<Blob | null> {
  if (!canRenderCard()) return null;

  const img = await decode(svg);
  if (!img) return null;

  let blob: Blob | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    blob = await new Promise<Blob | null>((resolve) => {
      // `toBlob` may hand back null, and the type says so. Dereferencing it is
      // the obvious way this becomes a crash inside a click handler.
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  } catch {
    // SecurityError from a tainted canvas lands here. Nothing in this card
    // should be able to taint one, which is why this is a guard rather than a
    // handled case: if it ever fires, something started referencing an external
    // resource and the share degrades to a link instead of throwing at a child.
    return null;
  }

  if (!blob || blob.size === 0 || blob.size > CARD_MAX_BYTES) return null;
  return blob;
}

/**
 * A file name a stranger will see in their downloads folder.
 *
 * The date and nothing else. NOT the game, not the player - a file name is a
 * piece of text that travels with the picture into somebody else's phone, and
 * it is exactly the kind of place a device-scoped id gets attached by accident.
 */
export function cardFileName(date: string): string {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "today";
  return `ellaz-${safe}.png`;
}

/** The PNG as a `File`, which is what `navigator.share` wants. */
export function toShareFile(blob: Blob, date: string): File | null {
  // `File` is missing on some older Android WebViews that have `Blob` and
  // `navigator.share` - so this is a real branch, not defensive noise.
  if (typeof File !== "function") return null;
  try {
    return new File([blob], cardFileName(date), { type: "image/png" });
  } catch {
    return null;
  }
}
