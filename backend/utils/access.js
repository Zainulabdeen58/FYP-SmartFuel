export const isOwnerOrAdmin = (req, ownerId) =>
  req.user.role === "Admin" || String(ownerId) === String(req.user._id);

// Filter for the records a user may list: their own; for an admin everyone's, or one chosen user's.
export function ownerFilter(req, chosenUserId = "") {
  if (req.user.role !== "Admin") return { user: req.user._id };
  return chosenUserId ? { user: chosenUserId } : {};
}
