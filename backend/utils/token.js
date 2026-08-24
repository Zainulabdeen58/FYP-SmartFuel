import jwt from "jsonwebtoken";

export function createToken(userId) {
  return jwt.sign({ userId }, "adfghjklmbxvxght", {
    expiresIn: "1d",
  });
}
