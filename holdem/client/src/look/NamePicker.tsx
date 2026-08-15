// Choose your name — both halves of it.
//
// Until now a player could only REROLL: press a die, get a random one of 320,
// press again. That is a slot machine, not a choice. This is the same 320
// names with both wheels held still: pick the adjective, pick the animal, and
// watch it land on your seat on the felt above.
//
// STILL NOT A TEXT FIELD, and that is the platform's shape rather than an
// omission — README § "Names are drawn, never typed". A poker table is a room
// with other people's names in it, so a free-text field is a moderation
// surface that has to be staffed forever; two ids crossing the wire is also
// why nothing a client sends is ever displayed. 320 real choices is what this
// screen buys back, at no cost to either property.
//
// The words themselves are ids, persisted per player and carried in saved hand
// history — so words may be ADDED and must never be renamed or removed.

import { ADJECTIVES, NOUNS, type PlayerName, renderName, rerollName } from "@shared/names";
import { Animal } from "../ui/animals";

/**
 * `onPick` takes HALF a name, not a whole one.
 *
 * The obvious signature is `onPick({ ...name, adj })` — merge here, hand over
 * the result. It is wrong, and wrong in the way that does not show up until
 * somebody taps quickly: `name` is a prop, so two taps inside one React render
 * both merge against the SAME old value and the first one is silently
 * discarded. Measured: tapping "Golden" then "Whale" stored
 * `{adj: "calm", noun: "whale"}` — the adjective the player chose first,
 * gone, with the name they can see reading correctly a moment later.
 *
 * Handing over the half that changed lets the owner merge against whatever is
 * current, which is the only value that can be right.
 */
export function NamePicker({
  name,
  onPick,
}: {
  name: PlayerName;
  onPick: (half: Partial<PlayerName>) => void;
}) {
  const rendered = renderName(name);

  return (
    <div>
      {/* What you are choosing, big, and drawn the way the felt draws it —
          same Animal component, so this cannot show a face the table does
          not. The seat above wears it too; this is here for when the felt is
          mid-fold and the plate is dimmed. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          marginBottom: 12,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-2)",
        }}
      >
        <Animal id={name.noun} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{rendered ?? "—"}</div>
          <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
            {ADJECTIVES.length} × {NOUNS.length} = {ADJECTIVES.length * NOUNS.length} names
          </div>
        </div>
        <button
          className="btn ghost"
          style={{ minHeight: 44 }}
          onClick={() => onPick(rerollName(name))}
        >
          Surprise me
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Column
          title="Describes you"
          items={ADJECTIVES.map((a) => ({ id: a.id, label: a.en }))}
          value={name.adj}
          onPick={(adj) => onPick({ adj })}
        />
        <Column
          title="You are a"
          items={NOUNS.map((n) => ({ id: n.id, label: n.en, animal: n.id }))}
          value={name.noun}
          onPick={(noun) => onPick({ noun })}
        />
      </div>

      <p style={{ color: "var(--ink-dim)", fontSize: 12, lineHeight: 1.5, marginTop: 14 }}>
        Nobody types a name here, which is why there is nothing to report and
        nothing to moderate — you cannot be sat next to something somebody
        typed. Your pick is saved on this device and travels to every table you
        join.
      </p>
    </div>
  );
}

function Column({
  title,
  items,
  value,
  onPick,
}: {
  title: string;
  items: { id: string; label: string; animal?: string }[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6, paddingInlineStart: 2 }}>
        {title}
      </div>
      {/* Each column scrolls on its own, capped, so twenty animals do not
          push the strip below them off the bottom of a phone — and so the two
          wheels stay side by side, which is what makes this read as one name
          in two parts rather than as two unrelated lists. */}
      <div
        style={{
          maxHeight: "40vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: 2,
        }}
      >
        {items.map((it) => {
          const on = it.id === value;
          return (
            <button
              key={it.id}
              className={on ? "btn primary" : "btn ghost"}
              style={{
                minHeight: 44,
                padding: "0 10px",
                fontSize: 14,
                fontWeight: on ? 800 : 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 8,
                flex: "0 0 auto",
              }}
              onClick={() => onPick(it.id)}
            >
              {it.animal && <Animal id={it.animal} size={20} />}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
