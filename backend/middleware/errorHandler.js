// Sends every error as JSON in the same { success, message } shape the
// controllers use. Express 5 forwards rejected async handlers here, so
// controllers don't need their own try/catch.
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

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "value";
    return fail(409, `This ${field} is already in use`);
  }

  // Errors from body parsing (e.g. payload too large) carry a safe status and message.
  if (err.expose && err.status >= 400 && err.status < 500) return fail(err.status, err.message);

  console.error(err);
  return fail(500, "Something went wrong. Please try again.");
}
