// Server-side input checks. The rules live in shared/validation.js, which the
// frontend forms use too, so the API rejects the same bad input the forms do,
// even when a request skips the UI.
export * from "../../shared/validation.js";

// Makes user-typed search text safe to use inside a MongoDB $regex.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
