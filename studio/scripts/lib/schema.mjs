// A small JSON-schema checker for the subset export/manifest.schema.json
// uses: type, required, properties, additionalProperties (false or a
// schema), pattern, minimum, exclusiveMinimum, minItems, items, $ref into
// #/$defs, and oneOf (added 2026-09-13 for a mode directory holding two
// shapes). No dependency, and its own controls live in
// assert-manifest-schema.mjs and toybox/data/data.test.ts.
//
// Returns every violation as "path: reason" with the operands whole.
//
// oneOf: exactly one branch must be clean. When none is, the errors of the
// branch whose `kind` literal matches the value's `kind` are reported whole
// (a value with no `kind` is held to the branch that names none), so a typo
// in a turn mode reads as the turn mode's errors and never as a wall of both
// branches' complaints. More than one clean branch is itself a violation.

const deref = (s, root) => (s.$ref ? s.$ref.replace(/^#\//, "").split("/").reduce((o, k) => o?.[k], root) : s);

/** the one string a branch's `kind` property admits (pattern "^turn$" -> "turn"), or undefined when it names none */
function kindOf(branch) {
  const p = branch?.properties?.kind?.pattern;
  const m = typeof p === "string" ? /^\^([a-z0-9-]+)\$$/.exec(p) : null;
  return m ? m[1] : undefined;
}

function validateOneOf(schema, value, root, path) {
  const branches = schema.oneOf.map((b) => deref(b, root));
  if (branches.some((b) => !b)) return [`${path}: unresolved $ref inside oneOf`];
  const errs = branches.map((b) => validate(b, value, root, path));
  const clean = errs.filter((e) => e.length === 0).length;
  if (clean === 1) return [];
  if (clean > 1) return [`${path}: matches ${clean} of ${branches.length} oneOf branches, expected exactly one`];
  const kind = value && typeof value === "object" && !Array.isArray(value) && typeof value.kind === "string" ? value.kind : undefined;
  const i = branches.findIndex((b) => kindOf(b) === kind);
  if (i >= 0) return errs[i];
  const names = branches.map((b, j) => kindOf(b) ?? `branch ${j} (no kind)`).join(", ");
  return [`${path}: kind ${JSON.stringify(kind)} matches no oneOf branch (${names})`];
}

export function validate(schema, value, root = schema, path = "$") {
  const out = [];
  if (schema.$ref) {
    const ref = deref(schema, root);
    if (!ref) return [`${path}: unresolved $ref ${schema.$ref}`];
    return validate(ref, value, root, path);
  }
  if (schema.oneOf) return validateOneOf(schema, value, root, path);
  const t = schema.type;
  const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (t === "integer") {
    if (!Number.isInteger(value)) return [`${path}: expected integer, got ${JSON.stringify(value)}`];
  } else if (t && actual !== t) {
    return [`${path}: expected ${t}, got ${actual} (${JSON.stringify(value)?.slice(0, 80)})`];
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${path}: ${value} is below minimum ${schema.minimum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) out.push(`${path}: ${value} is not above ${schema.exclusiveMinimum}`);
  }
  if (typeof value === "string" && schema.pattern && !new RegExp(schema.pattern).test(value)) out.push(`${path}: "${value}" does not match /${schema.pattern}/`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) out.push(`${path}: ${value.length} items, minimum ${schema.minItems}`);
    if (schema.items) value.forEach((v, i) => out.push(...validate(schema.items, v, root, `${path}[${i}]`)));
  }
  if (actual === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) out.push(`${path}: missing required "${k}"`);
    for (const [k, v] of Object.entries(value)) {
      const sub = schema.properties?.[k];
      if (sub) out.push(...validate(sub, v, root, `${path}.${k}`));
      else if (schema.additionalProperties === false) out.push(`${path}: unexpected key "${k}"`);
      else if (typeof schema.additionalProperties === "object") out.push(...validate(schema.additionalProperties, v, root, `${path}.${k}`));
    }
  }
  return out;
}
