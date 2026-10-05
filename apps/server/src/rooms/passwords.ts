/* Password hashing for room passwords (spec Sec 12: argon2). Plain text never leaves this module. */
import argon2 from "argon2"

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
}

export const argon2Hasher: PasswordHasher = {
  hash: (password) => argon2.hash(password),
  verify: (hash, password) => argon2.verify(hash, password),
}
