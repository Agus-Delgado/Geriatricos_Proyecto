import { scrypt } from "@noble/hashes/scrypt";
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}


const encoder = new TextEncoder();

const HASH_PREFIX = "scrypt";
const HASH_VERSION = "v1";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_DK_LEN = 32;
const SALT_LENGTH = 16;

function toBase64(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

type ParsedHash = {
  n: number;
  r: number;
  p: number;
  salt: Uint8Array;
  hash: Uint8Array;
};

function parseHash(encodedHash: string): ParsedHash | null {
  const parts = encodedHash.split("$");
  if (parts.length !== 7) {
    return null;
  }

  const [prefix, version, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  if (prefix !== HASH_PREFIX || version !== HASH_VERSION) {
    return null;
  }

  const n = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return null;
  }

  try {
    return {
      n,
      r,
      p,
      salt: fromBase64(saltB64),
      hash: fromBase64(hashB64)
    };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derived = scrypt(encoder.encode(password), salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: SCRYPT_DK_LEN
  });

  return [
    HASH_PREFIX,
    HASH_VERSION,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    toBase64(salt),
    toBase64(derived)
  ].join("$");
}

export function verifyPassword(password: string, encodedHash: string): boolean {
  const parsed = parseHash(encodedHash);
  if (!parsed) {
    return false;
  }

  const derived = scrypt(encoder.encode(password), parsed.salt, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
    dkLen: parsed.hash.length
  });

  return timingSafeEqual(derived, parsed.hash);
}
