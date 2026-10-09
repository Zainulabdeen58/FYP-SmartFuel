// Checks required settings before the server starts, so a missing or weak
// value stops startup with a clear message instead of failing later.
const MIN_JWT_SECRET_LENGTH = 32;

// The placeholder from .env.example is public, so it must never be used.
const EXAMPLE_JWT_SECRET = "replace-with-a-long-random-string";

export function checkJwtSecret(secret) {
  if (!secret) return "JWT_SECRET is not set.";
  if (secret === EXAMPLE_JWT_SECRET) return "JWT_SECRET is still the example value from .env.example.";
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return `JWT_SECRET is too short (${secret.length} characters). Use at least ${MIN_JWT_SECRET_LENGTH}.`;
  }
  return "";
}

export default function checkEnv() {
  const error = checkJwtSecret(process.env.JWT_SECRET);
  if (!error) return;

  console.error(`${error}
Anyone who knows or guesses this secret can sign in as any user, including an admin.
Generate a strong one and put it in backend/.env as JWT_SECRET=<value>:
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
  process.exit(1);
}
