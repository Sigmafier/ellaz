// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyPhoneBar } from "./phoneBar";

/**
 * The phone bar MOVES the page's real controls; it never copies them.
 *
 * A copy would be a second button with no listener, which is the one failure
 * this has to rule out: every control here is wired by `PageApp` with
 * `querySelector`, which finds exactly one node. So the test is about three
 * things - every control is still in the document exactly once, it is in the
 * right place for the width, and crossing back puts every node where the
 * emitter wrote it.
 */

function page(): Document {
  document.body.innerHTML = `
    <header class="top"><div class="in">
      <a class="hbtn home" href="/"></a>
      <b class="gname">Snake</b>
      <details class="lang"><summary class="hbtn ico"></summary></details>
      <button class="hbtn ico" data-sound></button>
      <details class="more"><summary class="hbtn ico"></summary><div class="moresheet"></div></details>
      <div class="wallet-wrap"></div>
    </div></header>
    <main>
      <div class="urow"><nav class="bc"></nav><div class="tools">
        <button class="ubtn" data-pause></button>
        <button class="ubtn" data-restart></button>
        <button class="ubtn" data-share></button>
        <button class="ubtn" data-fullscreen></button>
        <button class="ubtn" data-report></button>
      </div></div>
    </main>`;
  return document;
}

const where = (sel: string) => {
  const all = document.querySelectorAll(sel);
  expect(all.length, `${sel} must exist exactly once`).toBe(1);
  const el = all[0];
  if (el.closest(".moresheet")) return "sheet";
  if (el.closest(".top")) return "bar";
  if (el.closest(".urow")) return "row";
  return "elsewhere";
};

const order = () => [...document.querySelector(".top .in")!.children].map((e) => e.getAttribute("class") ?? [...e.attributes].map((a) => a.name).join(" "));

describe("the phone bar", () => {
  it("puts pause and restart in the bar, before sound, and the rest behind the more button", () => {
    const doc = page();
    applyPhoneBar(doc, true);
    expect(where("[data-pause]")).toBe("bar");
    expect(where("[data-restart]")).toBe("bar");
    expect(where("[data-sound]")).toBe("bar");
    for (const sel of [".lang", "[data-share]", "[data-fullscreen]", "[data-report]", ".wallet-wrap"]) {
      expect(where(sel), sel).toBe("sheet");
    }
    const bar = [...doc.querySelector(".top .in")!.children];
    const idx = (sel: string) => bar.findIndex((e) => e.matches(sel));
    expect(idx("[data-pause]")).toBeLessThan(idx("[data-restart]"));
    expect(idx("[data-restart]")).toBeLessThan(idx("[data-sound]"));
    expect(idx("[data-sound]")).toBeLessThan(idx(".more"));
  });

  it("puts every node back exactly where the emitter wrote it when the screen widens", () => {
    const doc = page();
    const before = doc.body.innerHTML;
    const bar = order();
    applyPhoneBar(doc, true);
    expect(doc.body.innerHTML).not.toBe(before); // the move landed - otherwise the next line proves nothing
    applyPhoneBar(doc, false);
    expect(order()).toEqual(bar);
    expect(doc.body.innerHTML).toBe(before);
  });

  it("is idempotent - applying the same width twice moves nothing twice", () => {
    const doc = page();
    applyPhoneBar(doc, true);
    const once = doc.body.innerHTML;
    applyPhoneBar(doc, true);
    expect(doc.body.innerHTML).toBe(once);
    applyPhoneBar(doc, false);
    const wide = doc.body.innerHTML;
    applyPhoneBar(doc, false);
    expect(doc.body.innerHTML).toBe(wide);
  });

  it("keeps a listener attached across the move - it is the same node, not a copy", () => {
    const doc = page();
    let clicks = 0;
    doc.querySelector<HTMLButtonElement>("[data-restart]")!.addEventListener("click", () => clicks++);
    applyPhoneBar(doc, true);
    doc.querySelector<HTMLButtonElement>(".top [data-restart]")!.click();
    applyPhoneBar(doc, false);
    doc.querySelector<HTMLButtonElement>(".urow [data-restart]")!.click();
    expect(clicks).toBe(2);
  });

  it("does nothing on a page without the more button - the room, the boards, an embed", () => {
    const doc = page();
    doc.querySelector(".more")!.remove();
    const before = doc.body.innerHTML;
    applyPhoneBar(doc, true);
    expect(doc.body.innerHTML).toBe(before);
  });
});
