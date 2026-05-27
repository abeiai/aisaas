# AGENTS.md

本文件是 Codex 在本仓库中执行开发任务时必须优先读取和遵守的全局规则。

## 1. 项目定位

本项目是一个面向中国市场的 **简体中文 AI SaaS / 内容型工具站底座**。

第一阶段目标不是一次性实现完整 AI 平台，而是尽快形成一个可访问、可登录、可管理内容、可展示前台页面的可运营基础框架。

第一阶段必须优先完成：

1. 简体中文前台网站
2. 简体中文管理后台
3. 前台用户注册、登录、退出
4. 后台管理员登录、退出
5. 简单 CMS
   - 文章分类管理
   - 文章管理
   - 单页管理
6. 基础系统配置
7. 后续预留支付宝、微信支付和 AI 点数消耗能力

---

## 2. 开发优先级

必须遵循以下顺序：

```text
可见页面 > 登录闭环 > 后台管理 > CMS 内容发布 > 支付充值 > 钱包流水 > AI 能力
```

不得长期停留在底层工程、数据库抽象、AI 网关、复杂账务等不可见模块上。  
每一批开发任务完成后，都必须能通过浏览器看到明确的页面变化或功能变化。

---

## 3. 技术栈约束

### 3.1 Monorepo

项目采用：

```text
pnpm + Monorepo Workspace
```

推荐目录结构：

```text
apps/
  web/          # Next.js 前台 + 用户中心 + 管理后台
  api-core/     # NestJS 核心业务 API
  ai-gateway/   # FastAPI AI 执行层，第一阶段只预留，可后置实现

packages/
  database/     # Prisma schema、migration、seed
  config/       # ESLint、Prettier、TSConfig 等共享配置
```

第一阶段重点开发：

```text
apps/web
apps/api-core
packages/database
packages/config
```

`apps/ai-gateway` 可以先建立空壳或 health check，但不得阻塞前后台、Auth、CMS 的开发。

---

### 3.2 前端技术栈

前端使用：

```text
Next.js App Router
TypeScript
TailwindCSS
shadcn/ui
Zustand
```

所有前端页面必须使用简体中文。

---

### 3.3 后端技术栈

核心业务后端使用：

```text
NestJS
TypeScript
Prisma ORM
PostgreSQL
Redis
```

NestJS 负责：

1. 用户注册与登录
2. 管理员登录
3. 权限校验
4. CMS 内容管理
5. 支付订单
6. 钱包与流水
7. AI 任务编排
8. 系统配置

第一阶段优先实现：

```text
Auth
AdminAuth
CMS
SystemConfig
```

后置实现：

```text
Payment
Wallet
AiTask
```

---

### 3.4 AI 执行层

AI 执行层预留：

```text
FastAPI
Python 3.11+
Uvicorn
```

第一阶段可以只保留：

```text
GET /health
```

FastAPI 不负责用户鉴权、管理员权限、充值、扣点、钱包流水、CMS 内容管理，也不得直连核心 PostgreSQL。

---

### 3.5 固定端口规则

本项目所有本地开发、Docker、生产 Compose、文档示例和默认环境变量只能使用 `7340-7360` 之间的端口，不得换用 `3000`、`3002`、`3003`、`5432`、`5433`、`6379`、`6380`、`8001`、`8080`、`8443` 等其他项目常用端口。

固定端口表：

```text
7340  Docker / Nginx HTTP 统一入口
7341  Next.js Web
7342  NestJS API Core
7343  FastAPI AI Gateway
7344  本地开发 PostgreSQL
7345  本地开发 Redis
7346  Docker / Nginx HTTPS 入口
7347  生产 Compose PostgreSQL
7348  生产 Compose Redis
7359  测试中需要故意不可达地址时使用
```

新增服务、脚本、测试、文档或环境变量时，必须先复用上表端口。确需新增端口时，只能从 `7349-7360` 中选择，并必须同步更新本节端口表；不得临时占用端口段外的值。

---

## 4. 简体中文约束

第一阶段只做简体中文版。

必须遵守：

1. 所有前台页面使用简体中文。
2. 所有后台页面使用简体中文。
3. 所有菜单、按钮、表单校验、错误提示使用简体中文。
4. 所有 seed 数据使用简体中文。

第一阶段禁止实现：

1. 英文站
2. 多语言路由
3. 多语言文章
4. 多语言后台
5. 多语言 SEO
6. 多语言 Prompt
7. 复杂 i18n 框架封装

数据库字段不要写成 `titleZh`、`contentZh`。  
第一阶段直接使用：

```text
title
slug
summary
content
seoTitle
seoDescription
```

---

## 5. 支付约束

第一阶段支付体系只支持：

```text
ALIPAY
WECHAT_PAY
```

禁止第一阶段实现：

1. Stripe
2. Paddle
3. PayPal
4. Apple Pay
5. Google Pay
6. 订阅自动续费
7. 国际支付
8. 多币种支付

第一版只做点数充值订单和支付回调预留。实际 SDK 接入可以后置，但模型层不得引入 Stripe、Paddle 等无关字段。

---

## 6. CMS 第一阶段范围

第一阶段必须实现简单 CMS：

1. 文章分类管理
2. 文章管理
3. 单页管理

禁止第一阶段实现：

1. 多语言内容
2. 可视化页面搭建器
3. 协同编辑
4. 版本历史
5. 复杂媒体资源库
6. 工作流审批

---

## 7. 用户与管理员约束

第一阶段必须区分：

```text
User
AdminUser
```

前台用户第一阶段支持：

1. 邮箱注册
2. 邮箱登录
3. 密码登录
4. 退出登录
5. 获取当前用户信息

后台管理员第一阶段支持：

1. 管理员账号登录
2. 管理员退出登录
3. 获取当前管理员信息
4. 后台路由鉴权

第一阶段可以先使用单一超级管理员角色：

```text
SUPER_ADMIN
```

暂时不做复杂权限矩阵。

---

## 8. API 响应格式

所有 NestJS API 必须使用统一响应格式：

```ts
{
  code: number
  message: string
  data: unknown
}
```

成功响应：

```ts
{
  code: 0,
  message: "成功",
  data: {}
}
```

失败响应：

```ts
{
  code: 40001,
  message: "请求参数错误",
  data: null
}
```

不得在不同模块中自定义不同响应格式。

---

## 9. 错误提示

所有错误提示必须使用简体中文。

不得直接向用户暴露：

1. Prisma error
2. SQL error
3. JWT malformed
4. Internal server error
5. Stack trace

内部错误可以写入日志，但返回给前端必须是中文友好提示。

---

## 10. Slug 约束

文章分类、文章、单页都必须支持 `slug`。

Slug 规则：

1. 同一资源类型下 slug 必须唯一。
2. slug 只能包含小写字母、数字和短横线。
3. slug 不允许为空。
4. slug 不允许使用系统保留路由。

保留 slug 示例：

```text
admin
login
register
dashboard
api
articles
pages
settings
```

---

## 11. 安全约束

第一阶段必须实现基础安全要求：

1. 密码必须哈希存储。
2. 不得明文存储用户密码。
3. JWT Secret 必须来自环境变量。
4. 数据库连接字符串必须来自环境变量。
5. 管理后台接口必须验证管理员身份。
6. 前台用户接口必须验证用户身份。
7. CMS 写操作必须要求管理员登录。
8. 前台只展示已发布内容。

禁止：

1. 在代码中硬编码密钥。
2. 在代码中硬编码数据库连接串。
3. 将管理员密码写死在源码中。
4. 未登录即可访问后台 API。
5. 前台访问草稿文章。

---

## 12. Codex 开发纪律

Codex 每次开发任务必须小步提交，不得一次性实现过多模块。

每个任务必须明确：

1. 允许修改的目录
2. 不允许修改的目录
3. 需要实现的功能
4. 验收命令
5. 验收页面
6. 是否需要数据库 migration
7. 是否需要 seed 更新

Codex 不得自行扩大需求范围。

开发 CMS 时不得顺手实现支付、AI、多语言、复杂权限、素材库、可视化建站。  
开发 Auth 时不得顺手实现 OAuth、短信验证码、魔法链接、企业微信登录。  
开发支付时不得顺手实现 Stripe、Paddle、订阅续费、多币种、发票系统。

---

## 13. 小修改任务规则

当用户要求“修改文案、按钮、样式、弹窗、轻量交互”时，默认采用最小 diff 模式。

### 13.1 默认限制

1. 不做架构重构。
2. 不迁移页面。
3. 不新增兼容路由。
4. 不升级依赖。
5. 不修改数据库 schema。
6. 不修改支付、登录、权限等核心流程，除非用户明确要求。
7. 优先复用现有组件和 API。
8. 修改总量超过 150 行前，必须先停止并说明原因。

### 13.2 验证规则

小修改默认只运行：

```bash
pnpm --filter @aisaas/web typecheck
```

只有在以下情况才运行 build：

1. 改动涉及 Next.js server component。
2. 改动涉及路由结构。
3. 改动涉及构建配置。
4. 用户明确要求完整构建验证。

不要默认运行：

1. curl 页面测试。
2. 端口检查。
3. 全量 build。
4. 全量 lint。
5. 全项目测试。

### 13.3 完成规则

完成后只汇报：

1. 修改文件
2. 修改内容
3. 执行的验证命令
4. 未执行的验证命令及原因

---

## 14. 第一阶段禁止实现清单

第一阶段明确禁止实现：

1. 多语言系统
2. Stripe 支付
3. Paddle 支付
4. 国际化订阅
5. 企业多租户
6. 复杂角色权限矩阵
7. OAuth 登录
8. 手机短信登录
9. 魔法链接
10. 复杂 AI Agent 编排
11. RAG 知识库
12. 多模型自动路由
13. 可视化页面搭建器
14. 协同编辑
15. 复杂媒体资源库
16. 小程序
17. APP

---

## 15. 推荐验收命令

Codex 每完成一个任务后，必须尽量运行：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

数据库相关命令：

```bash
pnpm db:migrate
pnpm db:seed
```

本地运行：

```bash
docker compose up -d
pnpm dev
```

如果某个命令暂时不存在，Codex 必须先说明原因，并补充对应 script，而不是忽略验收步骤。
