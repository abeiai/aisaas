import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/index.js";

export { hashPassword, verifyPassword } from "./password.js";
export { decryptSecret, encryptSecret, maskSecret } from "./secret-encryption.js";
export { PrismaClient };
export type {
  AdminRole,
  AiProviderAdapterType,
  AiProviderInstanceStatus,
  AiTaskStatus,
  AiProviderType,
  ContentStatus,
  CreditReservationStatus,
  KnowledgeDocumentStatus,
  LedgerEntryType,
  PaymentOrderStatus,
  PaymentProvider,
  Prisma,
  RefreshTokenType,
  UserStatus,
  WorkflowRunStatus
} from "../generated/client/index.js";

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL 未配置");
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl
  });

  prismaClient = new PrismaClient({
    adapter
  });

  return prismaClient;
}

export const databasePackageName = "@aisaas/database";
export const prismaSchemaPath = "packages/database/prisma/schema.prisma";
