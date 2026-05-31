import { CheckCircle2, Coins, CreditCard, QrCode, WalletCards } from "lucide-react";
import { headers } from "next/headers";
import QRCode from "qrcode";

import { PaymentOrderForm } from "@/components/billing/payment-order-form";
import { PaymentPoller } from "@/components/billing/payment-poller";
import { WechatJsapiLauncher } from "@/components/billing/wechat-jsapi-launcher";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth-actions";
import {
  createPaymentOrderAction,
  getAvailablePaymentProducts,
  getLedger,
  getPaymentOrder,
  getRechargeProducts,
  getWallet,
  mockPayOrderAction,
  type LedgerEntry,
  type PaymentOrder
} from "@/lib/billing-api";
import { detectPaymentScene } from "@/lib/payment-scene";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "未完成";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function statusVariant(status: PaymentOrder["status"]) {
  if (status === "PAID") {
    return "secondary" as const;
  }

  if (status === "FAILED" || status === "CLOSED") {
    return "muted" as const;
  }

  return "outline" as const;
}

function ledgerAmount(entry: LedgerEntry) {
  const sign = entry.amount > 0 ? "+" : "";

  return `${sign}${entry.amount.toLocaleString("zh-CN")} 点`;
}

function ledgerRelatedBusiness(entry: LedgerEntry) {
  if (entry.relatedOrder?.orderNo) {
    return entry.relatedOrder.orderNo;
  }

  if (entry.type === "TOP_UP" && entry.note) {
    return entry.note.replace(/^管理员充值：/, "");
  }

  if (entry.relatedTaskId) {
    return `任务 ${entry.relatedTaskId.slice(0, 8)}`;
  }

  return "无";
}

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string; error?: string; paid?: string }>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();
  await getCurrentUser();
  const [wallet, ledger, availableProducts, rechargeProducts] = await Promise.all([
    getWallet(),
    getLedger(),
    getAvailablePaymentProducts(),
    getRechargeProducts()
  ]);
  const initialScene = detectPaymentScene(requestHeaders.get("user-agent"));
  const authorizeUrl = `${process.env.PUBLIC_API_BASE_URL ?? "http://localhost:7342/api"}/payment/wechat/jsapi/authorize?redirect=${encodeURIComponent("/dashboard/billing")}`;
  const currentOrder = params.order
    ? await getPaymentOrder(params.order).catch(() => null)
    : null;
  const qrCodeDataUrl = currentOrder?.qrCodeUrl
    ? await QRCode.toDataURL(currentOrder.qrCodeUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 180
      })
    : null;

  return (
    <DashboardShell active="billing">
      <PaymentPoller enabled={Boolean(currentOrder && currentOrder.status !== "PAID")} />
      <section className="flex w-full flex-col gap-8 px-5 py-8">
        {params.error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              操作失败：{params.error}
            </CardContent>
          </Card>
        ) : null}

        {params.paid ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm">
              <CheckCircle2 data-icon="inline-start" />
              支付成功回调已处理，钱包余额和流水已刷新。
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                <WalletCards />
              </div>
              <CardDescription>当前可用点数</CardDescription>
              <CardTitle className="text-3xl">
                {wallet.availableCredits.toLocaleString("zh-CN")}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                <Coins />
              </div>
              <CardDescription>冻结点数</CardDescription>
              <CardTitle className="text-3xl">
                {wallet.frozenCredits.toLocaleString("zh-CN")}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                <CreditCard />
              </div>
              <CardDescription>累计充值</CardDescription>
              <CardTitle className="text-3xl">
                {wallet.totalTopUpCredits.toLocaleString("zh-CN")}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                <QrCode />
              </div>
              <CardDescription>累计消耗</CardDescription>
              <CardTitle className="text-3xl">
                {wallet.totalConsumedCredits.toLocaleString("zh-CN")}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>创建充值订单</CardTitle>
              <CardDescription>请选择充值套餐和支付方式。</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentOrderForm
                action={createPaymentOrderAction}
                authorizeUrl={authorizeUrl}
                initialScene={initialScene}
                products={availableProducts}
                rechargeOptions={rechargeProducts}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>订单状态</CardTitle>
              <CardDescription>创建订单后可在这里查看支付入口并等待订单状态刷新。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {currentOrder ? (
                <>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted-foreground">订单号</span>
                        <span className="font-mono text-sm">{currentOrder.orderNo}</span>
                      </div>
                      <Badge variant={statusVariant(currentOrder.status)}>
                        {currentOrder.statusName}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">支付方式：</span>
                        {currentOrder.providerName}
                      </div>
                      <div>
                        <span className="text-muted-foreground">金额：</span>¥
                        {currentOrder.amountCny}
                      </div>
                      <div>
                        <span className="text-muted-foreground">点数：</span>
                        {currentOrder.credits.toLocaleString("zh-CN")} 点
                      </div>
                      <div>
                        <span className="text-muted-foreground">支付时间：</span>
                        {formatDate(currentOrder.paidAt)}
                      </div>
                    </div>
                  </div>
                  {currentOrder.paymentMode === "UNCONFIGURED" ? (
                    <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                      当前支付渠道尚未配置真实商户参数。测试环境可启用模拟回调完成钱包闭环。
                    </div>
                  ) : null}
                  {currentOrder.action === "REDIRECT" && currentOrder.paymentUrl ? (
                    <Button asChild className="w-fit">
                      <a href={currentOrder.paymentUrl} rel="noreferrer" target="_blank">
                        打开支付页
                      </a>
                    </Button>
                  ) : null}
                  {qrCodeDataUrl ? (
                    <div className="flex w-fit flex-col gap-3 rounded-xl border border-border bg-background p-4">
                      <img alt="支付二维码" className="size-[180px]" src={qrCodeDataUrl} />
                      <p className="max-w-[180px] text-center text-xs text-muted-foreground">
                        请扫码完成支付，页面会自动刷新订单状态。
                      </p>
                    </div>
                  ) : null}
                  {currentOrder.action === "WECHAT_JSAPI" && currentOrder.launchParams ? (
                    <WechatJsapiLauncher params={currentOrder.launchParams} />
                  ) : null}
                  {currentOrder.status !== "PAID" && currentOrder.paymentMode === "UNCONFIGURED" ? (
                    <form action={mockPayOrderAction}>
                      <input name="orderId" type="hidden" value={currentOrder.id} />
                      <input name="orderNo" type="hidden" value={currentOrder.orderNo} />
                      <input name="provider" type="hidden" value={currentOrder.provider} />
                      <Button variant="outline" type="submit">模拟支付成功回调</Button>
                    </form>
                  ) : null}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                  暂无选中的订单。创建充值订单后会在这里展示状态。
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>充值流水</CardTitle>
            <CardDescription>展示最近 50 条钱包流水。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>余额</TableHead>
                    <TableHead>关联业务</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.length > 0 ? (
                    ledger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge>{entry.typeName}</Badge>
                        </TableCell>
                        <TableCell>{ledgerAmount(entry)}</TableCell>
                        <TableCell>{entry.balanceAfter.toLocaleString("zh-CN")} 点</TableCell>
                        <TableCell className="max-w-sm break-words text-xs">
                          {ledgerRelatedBusiness(entry)}
                        </TableCell>
                        <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        暂无钱包流水。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
