# 真实支付接入说明

本阶段只接入点数充值，支付渠道限定为支付宝和微信支付。不实现订阅续费、退款、发票、分账、多币种或国际支付。

## 环境变量

支付宝：

```text
ALIPAY_APP_ID
ALIPAY_ENV
ALIPAY_GATEWAY_URL
ALIPAY_PRIVATE_KEY
ALIPAY_PUBLIC_KEY
ALIPAY_NOTIFY_URL
```

`ALIPAY_ENV=sandbox` 使用支付宝沙箱网关，`ALIPAY_ENV=production` 使用正式网关。`ALIPAY_GATEWAY_URL` 仅用于特殊环境覆盖。

微信支付：

```text
WECHAT_PAY_MCH_ID
WECHAT_PAY_APP_ID
WECHAT_PAY_GATEWAY_URL
WECHAT_PAY_API_V3_KEY
WECHAT_PAY_PRIVATE_KEY
WECHAT_PAY_SERIAL_NO
WECHAT_PAY_PLATFORM_PUBLIC_KEY
WECHAT_PAY_PLATFORM_SERIAL_NO
WECHAT_PAY_NOTIFY_URL
```

微信支付 Native 下单返回 `code_url`，前台会渲染二维码。`WECHAT_PAY_API_V3_KEY` 必须是 32 字节。

## 回调地址

生产环境回调地址示例：

```text
https://example.com/api/payment/alipay/notify
https://example.com/api/payment/wechat/notify
```

回调处理要求：

1. 先验签，再入账。
2. 支付渠道、订单号、金额必须和本地订单一致。
3. 支付成功只允许入账一次。
4. 每次回调写入 `PaymentNotifyLog`。

## 后台运维

后台入口：

```text
/admin/payments
```

可执行操作：

```text
同步：查询支付渠道状态并刷新本地订单。
补单：只有渠道返回已支付时才允许补单，并写入管理员操作日志。
```

## 本地演示

本地未配置真实渠道密钥时，订单会以未配置模式返回占位支付信息。只有本地或演示环境可以启用模拟回调：

```text
ENABLE_MOCK_PAYMENT_NOTIFY=1
```

生产环境必须保持为空，避免绕过支付渠道验签。
