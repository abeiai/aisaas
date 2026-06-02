# AI SaaS Starter Kit

面向中国市场的简体中文 AI SaaS / 内容型工具站底座。

当前项目包含：

- Next.js 前台、用户中心和管理后台
- NestJS 核心 API
- Prisma + PostgreSQL 数据层
- Redis
- 简单 CMS：文章分类、文章、单页
- 邮箱注册登录、管理员登录
- 点数钱包、支付订单、支付宝/微信支付回调预留
- AI Provider、模型预设、AI 工具模板和任务记录
- FastAPI AI Gateway 预留层
- Docker Compose 本地和生产部署配置

## 固定端口

本项目只使用 `7340-7360` 端口段，避免和其他项目冲突。

```text
7340  Docker / Nginx HTTP 入口
7341  Next.js Web
7342  NestJS API Core
7343  FastAPI AI Gateway
7344  本地 PostgreSQL
7345  本地 Redis
7346  Docker / Nginx HTTPS 入口
7347  生产 Compose PostgreSQL
7348  生产 Compose Redis
```

## 本地启动

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

访问地址：

- 前台：http://localhost:7341
- 后台：http://localhost:7341/admin
- Docker 入口：http://localhost:7340
- API Health：http://localhost:7342/api/health

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm seed:demo
pnpm template:blank
pnpm release:check
```

## 生产部署

复制生产环境变量模板：

```bash
cp .env.production.example .env.production
```

构建和部署：

```bash
scripts/release/publish.sh
scripts/release/deploy.sh 0.0.0
```

详细说明见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 开发规则

仓库级开发规则见 [AGENTS.md](AGENTS.md)，视觉设计规则见 [DESIGN.md](DESIGN.md)。

第三方场景应用开发说明见 [docs/scene-application-development.md](docs/scene-application-development.md)。
