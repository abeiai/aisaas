import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/index.js";

export { hashPassword, verifyPassword } from "./password.js";
export { decryptSecret, encryptSecret, maskSecret } from "./secret-encryption.js";
export { PrismaClient };
export type {
  AdminRole,
  AudioBillingMode,
  AudioAssetType,
  AudioTaskStatus,
  AudioTaskType,
  BillingContextType,
  AiProviderAdapterType,
  AiProviderModality,
  AiProviderInstanceStatus,
  AiTaskStatus,
  AiProviderType,
  ContentModuleType,
  ContentStatus,
  CreditReservationStatus,
  KnowledgeDocumentStatus,
  LedgerEntryType,
  MediaAssetSource,
  MediaAssetType,
  PaymentAction,
  PageCompositionTargetType,
  PaymentOrderStatus,
  PaymentProduct,
  PaymentProvider,
  PaymentScene,
  ProductBillingMode,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationPointLotStatus,
  OrganizationQuotaLedgerDirection,
  OrganizationQuotaStatus,
  OrganizationQuotaType,
  OrganizationReservationStatus,
  OrganizationStatus,
  OrganizationUsageEventStatus,
  OrganizationWalletLedgerDirection,
  OrganizationWalletStatus,
  OrganizationWalletTransactionType,
  Prisma,
  RefreshTokenType,
  SmsCodePurpose,
  UserStatus,
  VoiceConsent,
  VoiceConsentType,
  VoiceAssetStatus,
  VoiceAssetType,
  VoiceAssetVisibility
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
