// Same rules as the frontend forms, so the API rejects the same input even without the UI.
export * from "../../shared/validation.js";

// Query values can be arrays (?vehicle=a&vehicle=b); only plain text is used.
export const queryText = (value) => (typeof value === "string" ? value.trim() : "");

// Escapes user text for use inside a MongoDB $regex.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// $regex that matches a registration number with any spacing ("lea 1234" finds "LEA-1234" and old "LEA 1234").
export function registrationNumberPattern(text) {
  const characters = [...text.toUpperCase().replace(/[\s-]/g, "")];
  return characters.map(escapeRegex).join("[\\s-]*");
}
