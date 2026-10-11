// Sends every error as { success: false, message }; Express 5 forwards rejected async handlers here.
const CAST_KINDS = { Number: "a number", ObjectId: "a valid id", Date: "a valid date" };

function castMessage(error) {
  if (error.path === "_id") return "Invalid id";
  return `${error.path} must be ${CAST_KINDS[error.kind] || "a valid value"}`;
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const fail = (status, message) => res.status(status).json({ success: false, message });

  if (err.type === "entity.parse.failed") return fail(400, "Request body is not valid JSON");
  if (err.name === "CastError") return fail(400, castMessage(err));

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((error) =>
      error.name === "CastError" ? castMessage(error) : error.message,
    );
    return fail(400, messages.join(". "));
  }

  // Unique index violation (email, registrationNumber).
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    if (field === "registrationNumber") {
      return fail(409, "A vehicle with this registration number already exists");
    }
    if (field === "email") return fail(409, "Email already registered");
    return fail(409, "This value is already in use");
  }

  // Other 4xx errors (e.g. payload too large); only "exposed" messages are safe to show.
  if (err.status >= 400 && err.status < 500) {
    return fail(err.status, err.expose ? err.message : "Bad request");
  }

  console.error(err);
  return fail(500, "Something went wrong. Please try again.");
}
