// A small JSON-schema checker for the subset export/manifest.schema.json
// uses: type, required, properties, additionalProperties (false or a
// schema), pattern, minimum, exclusiveMinimum, minItems, items, and $ref
// into #/$defs. No dependency, ~60 lines, and its own controls live in
// assert-manifest-schema.mjs.
//
// Returns every violation as "path: reason" with the operands whole.

export function validate(schema, value, root = schema, path = "$") {
  const out = [];
  if (schema.$ref) {
    const ref = schema.$ref.replace(/^#\//, "").split("/").reduce((o, k) => o?.[k], root);
    if (!ref) return [`${path}: unresolved $ref ${schema.$ref}`];
    return validate(ref, value, root, path);
  }
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
