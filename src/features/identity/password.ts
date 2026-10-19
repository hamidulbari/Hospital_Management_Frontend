const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
const LOWER = "abcdefghijkmnopqrstuvwxyz"; // no l
const DIGITS = "23456789"; // no 0 or 1
const SYMBOLS = "!@#%*-_=+?";

export type RandomInt = (maxExclusive: number) => number;

/** A random whole number below max, from the browser's secure generator (no modulo bias). */
export const cryptoRandomInt: RandomInt = (max) => {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
};

/**
 * A temporary password with an upper case letter, a lower case letter, a number and a symbol (at least 12 characters).
 * Characters that look alike (I, l, 1, O, 0) are left out so it can be read out loud.
 */
export function generatePassword(length = 16, randomInt: RandomInt = cryptoRandomInt): string {
  const size = Math.max(12, Math.min(64, length));
  const pick = (set: string) => set[randomInt(set.length)];
  const all = UPPER + LOWER + DIGITS + SYMBOLS;

  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}