// One table, one socket. The test this project did not have.
//
// THE DEFECT, measured on the live table rather than reasoned about: forty
// `visibilitychange` events produced FORTY-ONE WebSockets and TWENTY-TWO open
// at the same time (scripts/repro/double-socket.mjs). Every one of them
// received every broadcast and delivered it into the one store, and
// `StreetDealt` appends — so the felt showed the right three cards, twice, and
// then the right five, twice. The operator's words were "i see cards in flop
// go again and again hence i see more than 6 7 8 cards on deck".
//
// Two lines did it, and neither looks like a bug on its own:
//
//   · `wake()` returned early only when the socket was OPEN. A socket that is
//     still shaking hands is neither open nor gone, and coming back to a tab
//     fires wake every time.
//   · `open()` assigned `this.ws` without closing what was already there, so
//     the abandoned socket stayed live — and its own `onclose` ran the
//     reconnect ladder, which is why the count grew instead of settling at two.
//
// Node environment, so every browser thing here is a stub. That is the cost of
// testing a socket at all, and it is worth paying once.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

class FakeSocket {
  static made: FakeSocket[] = [];
  readyState = CONNECTING;
  sent: string[] = [];
  closedWith: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.made.push(this);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(code?: number): void {
    this.closedWith = code ?? 1000;
    this.readyState = CLOSED;
  }
  /** The server accepting the handshake. */
  accept(): void {
    this.readyState = OPEN;
    this.onopen?.();
  }
  /** A frame arriving from the server. */
  deliver(msg: unknown): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

let wakeHandlers: (() => void)[] = [];

beforeEach(() => {
  FakeSocket.made = [];
  wakeHandlers = [];
  const store = new Map<string, string>();

  vi.stubGlobal("WebSocket", Object.assign(FakeSocket, { CONNECTING, OPEN, CLOSING, CLOSED }));
  vi.stubGlobal("location", { protocol: "https:", host: "poker.ellaz.fun" });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("crypto", { randomUUID: () => "test-token" });
  vi.stubGlobal("document", {
    visibilityState: "visible",
    addEventListener: (type: string, fn: () => void) => {
      if (type === "visibilitychange") wakeHandlers.push(fn);
    },
  });
  vi.stubGlobal("window", { addEventListener: (_t: string, fn: () => void) => wakeHandlers.push(fn) });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** Fresh module state per test — the socket is a singleton. */
async function freshSocket() {
  vi.resetModules();
  const mod = await import("./socket");
  const store = await import("../state/store");
  return { socket: mod.socket, ...store };
}

/** Everything a person coming back to the tab triggers. */
const comeBackToTheTab = () => wakeHandlers.forEach((fn) => fn());

describe("one table, one socket", () => {
  it("does not start a second socket while the first is still connecting", async () => {
    const { socket } = await freshSocket();
    socket.connect("PRACT");
    expect(FakeSocket.made).toHaveLength(1);
    expect(FakeSocket.made[0].readyState).toBe(CONNECTING);

    // The connect handshake takes a moment, and this is that moment. Before
    // the fix each of these opened another socket.
    for (let i = 0; i < 10; i++) comeBackToTheTab();

    expect(FakeSocket.made).toHaveLength(1);
  });

  it("does not start a second socket once the first is open", async () => {
    const { socket } = await freshSocket();
    socket.connect("PRACT");
    FakeSocket.made[0].accept();

    for (let i = 0; i < 10; i++) comeBackToTheTab();

    expect(FakeSocket.made).toHaveLength(1);
  });

  it("replaces a dead socket rather than adding to it", async () => {
    const { socket } = await freshSocket();
    socket.connect("PRACT");
    const first = FakeSocket.made[0];
    first.accept();

    // A socket the phone or the network killed without telling us. This is the
    // case wake exists for, and it must produce a replacement, not a crowd.
    first.readyState = CLOSED;
    comeBackToTheTab();
    comeBackToTheTab();

    expect(FakeSocket.made).toHaveLength(2);
    expect(FakeSocket.made[1].readyState).toBe(CONNECTING);
  });

  it("silences the socket it replaces — no frames, no reconnect ladder", async () => {
    const { socket, getState } = await freshSocket();
    socket.connect("PRACT");
    const first = FakeSocket.made[0];
    first.accept();

    // CLOSING, not CLOSED: the handshake has begun and frames are still
    // arriving. This is the window the count grew in.
    first.readyState = CLOSING;
    comeBackToTheTab();
    expect(FakeSocket.made).toHaveLength(2);

    // The one that was replaced was actually closed...
    expect(first.closedWith).toBe(1000);
    // ...cannot speak to the store...
    expect(first.onmessage).toBeNull();
    // ...and cannot breed. Its onclose ran the reconnect ladder, which is why
    // this used to grow without bound instead of settling at two.
    expect(first.onclose).toBeNull();

    const before = getState().handBoard.length;
    first.deliver({ t: "ev", seq: 99, events: [{ type: "StreetDealt", street: "flop", cards: [1, 2, 3] }] });
    expect(getState().handBoard.length).toBe(before);
  });

  it("a frame from a replaced socket is refused even if it is dispatched", async () => {
    // Nulling the handlers is the belt; this is the brace. A frame already in
    // flight when the swap happens cannot be un-dispatched, so every handler
    // asks whether it is still the current socket.
    const { socket, getState } = await freshSocket();
    socket.connect("PRACT");
    const first = FakeSocket.made[0];
    first.accept();
    const onmessage = first.onmessage!;

    first.readyState = CLOSED;
    comeBackToTheTab();
    expect(FakeSocket.made).toHaveLength(2);

    onmessage({
      data: JSON.stringify({ t: "ev", seq: 99, events: [{ type: "StreetDealt", street: "flop", cards: [1, 2, 3] }] }),
    });
    expect(getState().handBoard).toEqual([]);
  });

  it("leaving the table closes the socket and stops the ladder", async () => {
    const { socket } = await freshSocket();
    socket.connect("PRACT");
    const first = FakeSocket.made[0];
    first.accept();

    socket.disconnect();
    expect(first.closedWith).toBe(1000);
    expect(first.readyState).toBe(CLOSED);

    comeBackToTheTab();
    expect(FakeSocket.made).toHaveLength(1);
  });

  it("says hello exactly once per socket", async () => {
    // Two sockets means two hellos, which is how the server ends up holding
    // two seats' worth of presence for one person.
    const { socket } = await freshSocket();
    socket.connect("PRACT");
    FakeSocket.made[0].accept();
    for (let i = 0; i < 5; i++) comeBackToTheTab();

    const hellos = FakeSocket.made.flatMap((s) => s.sent).filter((m) => JSON.parse(m).t === "hello");
    expect(hellos).toHaveLength(1);
  });
});
