import "server-only"

import { timingSafeEqual } from "node:crypto"

export class AdminSecretConfigurationError extends Error {
  /** Create an error for a missing admin-secret configuration. */
  constructor() {
    super("Missing required server configuration: BIASLY_ADMIN_SECRET")
    this.name = "AdminSecretConfigurationError"
  }
}

/**
 * Compare the admin-secret header with the configured secret using timing-safe byte comparison
 * when lengths match. Return false for a missing or mismatched header.
 * @throws {AdminSecretConfigurationError} If BIASLY_ADMIN_SECRET is not configured.
 */
export function isAuthorizedAdminRequest(request: Request) {
  const expected = process.env.BIASLY_ADMIN_SECRET
  if (!expected) throw new AdminSecretConfigurationError()

  const supplied = request.headers.get("x-biasly-admin-secret")
  if (!supplied) return false

  const suppliedBytes = Buffer.from(supplied)
  const expectedBytes = Buffer.from(expected)

  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes)
}
