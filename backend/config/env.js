// Stops startup with a clear message if JWT_SECRET is missing or weak.
const MIN_JWT_SECRET_LENGTH = 32;

// The .env.example placeholder is public, so it is refused.
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
  // Optional: without it trips still save, but routes and place search are off.
  if (!process.env.ORS_API_KEY) {
    console.warn("ORS_API_KEY is not set, so trip routes and place search are off. Get a free key at openrouteservice.org and add it to backend/.env.");
  }

  const error = checkJwtSecret(process.env.JWT_SECRET);
  if (!error) return;

  console.error(`${error}
Anyone who knows or guesses this secret can sign in as any user, including an admin.
Generate a strong one and put it in backend/.env as JWT_SECRET=<value>:
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
  process.exit(1);
}
