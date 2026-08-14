// The Worker's bindings, in their own file.
//
// `index.ts` exports the Durable Object classes, so a class importing `Env`
// from `index.ts` would close a module cycle — legal for a type-only import
// today, and a runtime cycle the first time somebody adds a value import to
// it. One small module both sides can depend on costs nothing and cannot.

export interface Env {
  TABLE: DurableObjectNamespace;
  LOBBY: DurableObjectNamespace;
  ALLOWED_ORIGINS: string;
}
