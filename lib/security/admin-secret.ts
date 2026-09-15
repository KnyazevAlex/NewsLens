import "server-only"

import { timingSafeEqual } from "node:crypto"

export class AdminSecretConfigurationError extends Error {
  constructor() {
    super("Missing required server configuration: BIASLY_ADMIN_SECRET")
    this.name = "AdminSecretConfigurationError"
  }
}

export function isAuthorizedAdminRequest(request: Request) {
  const expected = process.env.BIASLY_ADMIN_SECRET
  if (!expected) throw new AdminSecretConfigurationError()

  const supplied = request.headers.get("x-biasly-admin-secret")
  if (!supplied) return false

  const suppliedBytes = Buffer.from(supplied)
  const expectedBytes = Buffer.from(expected)

  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes)
}
