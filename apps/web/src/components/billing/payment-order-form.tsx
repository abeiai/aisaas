"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { detectPaymentScene, paymentSceneName, type PaymentScene } from "@/lib/payment-scene";
import type { AvailablePaymentProduct } from "@/lib/billing-api";

interface PaymentOrderFormProps {
  action: (formData: FormData) => void;
  authorizeUrl: string;
  initialScene: PaymentScene;
  products: AvailablePaymentProduct[];
  rechargeOptions: ReadonlyArray<{
    code: string;
    name: string;
    amountCny: string;
    credits: number;
    description: string;
  }>;
}

export function PaymentOrderForm({
  action,
  authorizeUrl,
  initialScene,
  products,
  rechargeOptions
}: PaymentOrderFormProps) {
  const [scene, setScene] = useState<PaymentScene>(initialScene);

  useEffect(() => {
    setScene(detectPaymentScene(window.navigator.userAgent));
  }, []);

  const sceneProducts = useMemo(
    () => products.filter((product) => product.scene === scene),
    [products, scene]
  );
  const selectedProduct = sceneProducts[0] ?? null;
  const needsAuthorization = selectedProduct?.requiresAuthorization ?? false;

  return (
    <form action={action} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel>充值套餐</FieldLabel>
          <div className="grid gap-3 md:grid-cols-3">
            {rechargeOptions.map((item, index) => (
              <label
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-background p-4"
                key={item.code}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{item.name}</span>
                  <input defaultChecked={index === 1} name="packageCode" type="radio" value={item.code} />
                </span>
                <span className="font-display text-3xl font-light">¥{item.amountCny}</span>
                <span className="text-sm text-muted-foreground">
                  {item.credits.toLocaleString("zh-CN")} 点 · {item.description}
                </span>
              </label>
            ))}
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="provider">支付方式</FieldLabel>
          <input name="scene" type="hidden" value={scene} />
          {sceneProducts.length > 0 ? (
            <>
              <Select id="provider" name="provider" defaultValue={selectedProduct?.provider}>
                {sceneProducts.map((product) => (
                  <option key={product.product} value={product.provider}>
                    {product.providerName}
                  </option>
                ))}
              </Select>
              <FieldDescription>
                当前环境：{paymentSceneName(scene)}。{sceneProducts.map((product) => product.description).join("；")}
              </FieldDescription>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              当前环境暂无可用支付方式。
            </div>
          )}
        </Field>
      </FieldGroup>
      {needsAuthorization ? (
        <Button asChild className="w-fit">
          <a href={authorizeUrl}>先授权微信支付</a>
        </Button>
      ) : (
        <Button className="w-fit" disabled={sceneProducts.length === 0} type="submit">
          创建充值订单
        </Button>
      )}
    </form>
  );
}
