import { createSign, createVerify } from "node:crypto";

export function normalizePem(value: string) {
  const trimmed = value.trim().replace(/\\n/g, "\n");

  if (trimmed.includes("-----BEGIN")) {
    return trimmed;
  }

  return [
    "-----BEGIN PRIVATE KEY-----",
    trimmed,
    "-----END PRIVATE KEY-----"
  ].join("\n");
}

export function normalizePublicKey(value: string) {
  const trimmed = value.trim().replace(/\\n/g, "\n");

  if (trimmed.includes("-----BEGIN")) {
    return trimmed;
  }

  return [
    "-----BEGIN PUBLIC KEY-----",
    trimmed,
    "-----END PUBLIC KEY-----"
  ].join("\n");
}

export function signRsaSha256(content: string, privateKey: string) {
  return createSign("RSA-SHA256").update(content, "utf8").sign(normalizePem(privateKey), "base64");
}

export function verifyRsaSha256(content: string, signature: string, publicKey: string) {
  return createVerify("RSA-SHA256")
    .update(content, "utf8")
    .verify(normalizePublicKey(publicKey), signature, "base64");
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

export function toInputJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}
