import argon2 from "argon2";

/**
 * Hashes a plaintext password using the Argon2id algorithm.
 * 
 * @param password Plaintext password to hash
 * @returns Cryptographically secure hash string
 */
export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id, // Explicitly enforce Argon2id mode
    memoryCost: 65536,     // 64MB memory cost (standard secure production configuration)
    timeCost: 3,           // 3 iterations
    parallelism: 4,        // 4 threads
  });
};

/**
 * Verifies a plaintext password against an Argon2id hash.
 * 
 * @param password Plaintext password to verify
 * @param hash Recorded secure hash
 * @returns Boolean representing verification success
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};
