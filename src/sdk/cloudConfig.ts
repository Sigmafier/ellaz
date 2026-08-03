// The Firebase web config, committed on purpose.
//
// These values are PUBLIC by design. A Firebase web `apiKey` identifies a
// project to Google's endpoints; it authorises nothing. Anything a browser can
// do with it, anyone reading the shipped bundle can do too — which is why the
// real security boundary is Firestore rules plus anonymous auth, and why
// Google's own documentation says to ship them.
//
// They are committed rather than read from a repo secret because of a mistake
// this project has already made once. `VITE_POSTHOG_KEY` was wired through both
// deploy workflows and never set, so Vite substituted an empty string at build
// time, `if (!key) return` became always-true, the whole init was
// dead-code-eliminated, and analytics silently discarded every event since
// launch. Nobody noticed for months, because a missing secret produces a
// perfectly green build. Putting a value that is public anyway behind that same
// mechanism would be buying an outage risk for no secrecy at all.
//
// The env override exists so a fork, a staging project, or a contributor
// without access to this one can point it elsewhere without editing source.

const FALLBACK = {
  apiKey: "AIzaSyDauvXsn6WL10fdtKRCo5l5PfLuRVXuWwA",
  projectId: "ellaz-games",
} as const;

export interface CloudConfig {
  apiKey: string;
  projectId: string;
}

/**
 * The project this build talks to.
 *
 * `import.meta.env.VITE_*` is substituted at BUILD time, so an unset override
 * is the empty string rather than undefined — hence the explicit truthiness
 * check rather than `??`, which would happily return `""` and produce requests
 * against a project id of nothing.
 */
export function cloudConfig(): CloudConfig {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK.apiKey;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || FALLBACK.projectId;
  return { apiKey, projectId };
}
