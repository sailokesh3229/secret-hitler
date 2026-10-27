import { generateKeyPairSync, sign } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { createFirebaseVerifier } from "./tokenVerifier.js"

const projectId = "coursework-test"
const clock = 1_700_000_000_000
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString()
const fetcher = vi.fn(async () => new Response(JSON.stringify({ current: publicPem }), {
  headers: { "cache-control": "public, max-age=3600" },
}))

function token(claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}, tamper = false): string {
  const head = Buffer.from(JSON.stringify({ alg: "RS256", kid: "current", ...header })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({
    aud: projectId,
    iss: "https://securetoken.google.com/" + projectId,
    sub: "firebase-uid",
    exp: clock / 1000 + 3600,
    iat: clock / 1000 - 10,
    auth_time: clock / 1000 - 10,
    firebase: { sign_in_provider: "password" },
    ...claims,
  })).toString("base64url")
  const signature = sign("RSA-SHA256", Buffer.from(head + "." + payload), privateKey).toString("base64url")
  return head + "." + payload + "." + (tamper ? signature.slice(0, -2) + "xx" : signature)
}

describe("Firebase public-certificate verification", () => {
  it("accepts a signed email identity and caches Google's certificate", async () => {
    fetcher.mockClear()
    const verifier = createFirebaseVerifier({ FIREBASE_PROJECT_ID: projectId }, { fetcher, now: () => clock })
    expect(await verifier.verify(token())).toEqual({ provider: "password", providerUid: "firebase-uid" })
    expect(await verifier.verify(token())).toEqual({ provider: "password", providerUid: "firebase-uid" })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["forged signature", {}, {}, true],
    ["wrong audience", { aud: "other" }, {}, false],
    ["wrong issuer", { iss: "https://other" }, {}, false],
    ["expired", { exp: clock / 1000 }, {}, false],
    ["future issue time", { iat: clock / 1000 + 1 }, {}, false],
    ["future authentication time", { auth_time: clock / 1000 + 1 }, {}, false],
    ["empty UID", { sub: "" }, {}, false],
    ["missing sign-in provider", { firebase: {} }, {}, false],
    ["wrong algorithm", {}, { alg: "HS256" }, false],
    ["unknown key", {}, { kid: "unknown" }, false],
  ])("rejects %s", async (_name, claims, header, tamper) => {
    const verifier = createFirebaseVerifier({ FIREBASE_PROJECT_ID: projectId }, { fetcher, now: () => clock })
    expect(await verifier.verify(token(claims, header, tamper))).toBeNull()
  })

  it("rejects malformed tokens and unavailable certificates", async () => {
    const unavailable = createFirebaseVerifier({ FIREBASE_PROJECT_ID: projectId }, {
      fetcher: async () => new Response("", { status: 503 }),
      now: () => clock,
    })
    expect(await unavailable.verify("not-a-jwt")).toBeNull()
    expect(await unavailable.verify(token())).toBeNull()
  })
})
