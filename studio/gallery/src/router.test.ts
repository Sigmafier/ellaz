import { hashFor, parseRoute } from "./router";

describe("the gallery router", () => {
  it("reads a page and its params from the hash", () => {
    const r = parseRoute("#/sprites?char=slime&style=crayon");
    expect(r.id).toBe("sprites");
    expect(r.params.get("char")).toBe("slime");
    expect(r.params.get("style")).toBe("crayon");
  });

  it("falls back to the first page on an unknown or empty hash", () => {
    expect(parseRoute("").id).toBe("styles");
    expect(parseRoute("#/nowhere").id).toBe("styles");
    expect(parseRoute("#").id).toBe("styles");
  });

  it("builds a hash that parses back to the same route, dropping empty params", () => {
    const h = hashFor("styles", { scene: "reference", open: null, x: "" });
    expect(h).toBe("#/styles?scene=reference");
    expect(parseRoute(h).params.get("scene")).toBe("reference");
    expect(hashFor("palettes")).toBe("#/palettes");
  });
});
