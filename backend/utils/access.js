// Admins may read and change every record; other users only their own.
export const isOwnerOrAdmin = (req, ownerId) =>
  req.user.role === "Admin" || String(ownerId) === String(req.user._id);
