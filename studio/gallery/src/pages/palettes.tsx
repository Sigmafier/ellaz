import { PALETTES, toGpl, toHex } from "../../../art/palettes";
import { Lede } from "../ui";

export function PalettesMain() {
  return (
    <>
      <Lede>The canonical JSON in art/palettes, with its .gpl and .hex exports (what Aseprite, GIMP and Lospec read). Roles are the art bible's: player, enemy, interactable, warning, ground, text.</Lede>
      {PALETTES.map((p) => (
        <section key={p.id} className="mb-6">
          <h2 className="mb-1 mt-2 text-lg font-bold">{p.name} <code className="rounded-md border bg-secondary px-1.5 text-[13px] font-normal">{p.id}</code></h2>
          <Lede>{p.note}</Lede>
          <div className="flex flex-wrap gap-2">
            {p.colors.map((c) => (
              <div key={c.hex + c.name} className="w-[92px] overflow-hidden rounded-lg border-2 bg-card text-[11px]">
                <i className="block h-[52px]" style={{ background: c.hex }} />
                <b className="block px-1.5 pt-1">{c.name}</b>
                <span className="block px-1.5 pb-1.5 text-muted-foreground">{c.hex}{c.role ? ` · ${c.role}` : ""}</span>
              </div>
            ))}
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer font-bold">.gpl / .hex</summary>
            <pre className="mt-1 overflow-x-auto rounded-lg border bg-card p-3 text-xs">{toGpl(p) + "\n" + toHex(p)}</pre>
          </details>
        </section>
      ))}
    </>
  );
}
