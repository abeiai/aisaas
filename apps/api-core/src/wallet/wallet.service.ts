import { Injectable } from "@nestjs/common";
import { getPrismaClient } from "@aisaas/database";

type LedgerEntryType = "TOP_UP" | "RESERVE" | "CONSUME" | "RELEASE" | "REFUND" | "ADMIN_ADJUST";

@Injectable()
export class WalletService {
  private readonly prisma = getPrismaClient();

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.upsert({
      where: {
        userId
      },
      update: {},
      create: {
        userId
      }
    });

    return {
      id: wallet.id,
      userId: wallet.userId,
      availableCredits: wallet.availableCredits,
      frozenCredits: wallet.frozenCredits,
      totalTopUpCredits: wallet.totalTopUpCredits,
      totalConsumedCredits: wallet.totalConsumedCredits,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    };
  }

  async listLedger(userId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50,
      include: {
        relatedOrder: true
      }
    });

    return entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      type: entry.type,
      typeName: this.typeName(entry.type),
      amount: entry.amount,
      balanceAfter: entry.balanceAfter,
      relatedOrderId: entry.relatedOrderId,
      relatedTaskId: entry.relatedTaskId,
      relatedAudioTaskId: entry.relatedAudioTaskId,
      relatedTaskType: entry.relatedTaskType,
      operationType: entry.operationType,
      operationTypeName: entry.operationType ? audioTaskTypeName(entry.operationType) : null,
      idempotencyKey: entry.idempotencyKey,
      note: entry.note,
      createdAt: entry.createdAt,
      relatedOrder: entry.relatedOrder
        ? {
            id: entry.relatedOrder.id,
            orderNo: entry.relatedOrder.orderNo,
            provider: entry.relatedOrder.provider,
            amountCny: entry.relatedOrder.amountCny.toString(),
            credits: entry.relatedOrder.credits,
            status: entry.relatedOrder.status
          }
        : null
    }));
  }

  private typeName(type: LedgerEntryType) {
    const names: Record<LedgerEntryType, string> = {
      TOP_UP: "充值入账",
      RESERVE: "点数冻结",
      CONSUME: "点数消耗",
      RELEASE: "释放冻结",
      REFUND: "退款退回",
      ADMIN_ADJUST: "管理员调整"
    };

    return names[type];
  }
}

function audioTaskTypeName(type: string) {
  const names: Record<string, string> = {
    TTS: "语音合成",
    VOICE_CLONE: "声音复刻",
    VOICE_DESIGN: "声音设计"
  };

  return names[type] ?? type;
}
