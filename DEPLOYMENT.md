# AI SaaS 生产部署手册

本项目第一阶段采用单机 Docker Compose 部署，不引入 Kubernetes，不接入真实 AI Provider。支付仅接入支付宝和微信支付的点数充值链路。

## 1. 发布合约

- 版本来源：根目录 `package.json` 的 `version` 字段。
- 镜像命名：`<IMAGE_REGISTRY>/<IMAGE_NAMESPACE>/<IMAGE_PROJECT>:<service>-<version>`。
- 运行服务：`nginx`、`web`、`api-core`、`ai-gateway`、`postgres`、`redis`。
- 生产 Compose：`docker-compose.prod.yml`。
- 生产环境变量：`.env.production`，由 `.env.production.example` 复制后填写。
- Migration 命令：`pnpm --filter @aisaas/database db:migrate:deploy`。
- 回滚方式：重新部署上一个已发布的不可变镜像版本。

## 2. 服务器准备

推荐准备一台 Linux 服务器，并确认：

```bash
docker --version
docker compose version
```

开放端口：

```text
80/tcp
443/tcp
```

生产公网入口使用常用端口 `80/443`；Compose 内部仍将其映射到 Nginx 容器的 `7340/7346`。

部署目录示例：

```bash
mkdir -p /opt/aisaas
cd /opt/aisaas
```

如果宿主机是 Linux，并且 API 容器使用非 root 用户写日志和上传目录，先创建目录：

```bash
mkdir -p deploy/data/logs/api-core deploy/data/logs/nginx deploy/data/uploads deploy/certs
sudo chown -R 1000:1000 deploy/data/logs/api-core deploy/data/uploads
```

## 3. 环境变量配置

复制模板：

```bash
cp .env.production.example .env.production
```

必须替换：

```text
APP_BASE_URL
POSTGRES_PASSWORD
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SECRET_ENCRYPTION_KEY
DEFAULT_ADMIN_EMAIL
DEFAULT_ADMIN_PASSWORD
IMAGE_REGISTRY
IMAGE_NAMESPACE
IMAGE_PROJECT
```

`API_BASE_URL` 在容器内默认使用：

```text
http://api-core:7342/api
```

前台对外访问域名由 `APP_BASE_URL` 表示，例如：

```text
https://example.com
```

支付变量需要按实际渠道填写。支付宝使用 `ALIPAY_*`，微信支付使用 `WECHAT_PAY_*`，回调地址必须是公网可访问的 `/api/payment/alipay/notify` 和 `/api/payment/wechat/notify`。

生产环境不要设置：

```text
ENABLE_MOCK_PAYMENT_NOTIFY
```

真实支付配置和后台补单流程见 `docs/ops/real-payment.md`。

真实 AI Provider 需要配置 `SECRET_ENCRYPTION_KEY`，并可通过 `.env.production` 的 `AI_PROVIDER_*` 变量 seed 默认模型，也可在后台 `/admin/ai-providers` 配置。详见 `docs/ops/real-ai-provider.md`。

## 4. 构建并发布镜像

先做 dry-run，确认镜像标签：

```bash
DRY_RUN=1 scripts/release/publish.sh
```

真实发布：

```bash
IMAGE_REGISTRY="registry.example.com" \
IMAGE_NAMESPACE="aisaas" \
IMAGE_PROJECT="aisaas" \
scripts/release/publish.sh
```

指定版本发布：

```bash
VERSION="0.1.0" scripts/release/publish.sh
```

发布脚本会分别构建并推送：

```text
web-<version>
api-core-<version>
ai-gateway-<version>
```

## 5. 数据库启动

首次部署前先启动 PostgreSQL 和 Redis：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

PostgreSQL 数据保存在 Compose volume `aisaas-prod_postgres_data`，Redis 数据保存在 `aisaas-prod_redis_data`。

生产 Compose 默认只把 PostgreSQL 绑定到宿主机本地回环地址，便于备份：

```text
127.0.0.1:${POSTGRES_HOST_PORT:-7347}
```

## 6. Migration

每次上线前先备份：

```bash
DATABASE_URL="postgresql://aisaas:数据库密码@127.0.0.1:7347/aisaas?schema=public" \
scripts/backup-postgres.sh /data/backups/aisaas-postgres
```

使用部署脚本时，migration 会在应用容器启动前显式执行：

```bash
scripts/release/deploy.sh 0.0.0
```

手动执行 migration：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api-core \
  pnpm --filter @aisaas/database db:migrate:deploy
```

生产环境禁止执行 `prisma migrate reset` 或删除 volume 来“修复”迁移问题。迁移失败时应停止部署，保留现场日志，必要时按备份文件恢复。

## 7. Seed

首次部署需要创建默认超级管理员和基础 CMS 内容：

```bash
RUN_SEED=1 scripts/release/deploy.sh 0.0.0
```

也可以手动执行：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api-core \
  pnpm --filter @aisaas/database db:seed
```

`DEFAULT_ADMIN_EMAIL` 和 `DEFAULT_ADMIN_PASSWORD` 必须来自 `.env.production`。Seed 执行后请立即用强密码登录后台，并按需要调整系统配置里的站点地址。

## 8. 服务启动

推荐通过部署脚本启动指定版本：

```bash
DRY_RUN=1 scripts/release/deploy.sh 0.0.0
scripts/release/deploy.sh 0.0.0
```

本地源码构建验收也可以使用：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

查看容器：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## 9. Nginx 配置

默认 HTTP 反向代理文件：

```text
deploy/nginx/conf.d/default.conf
```

路由规则：

```text
/        -> web:7341
/api/    -> api-core:7342
/ai-api/ -> ai-gateway:7343
/uploads/ -> 本地 uploads 挂载目录
```

Nginx 日志挂载：

```text
deploy/data/logs/nginx/access.log
deploy/data/logs/nginx/error.log
```

## 10. HTTPS 配置

HTTPS 示例文件：

```text
deploy/nginx/conf.d/https.example
```

启用步骤：

```bash
cp deploy/nginx/conf.d/https.example deploy/nginx/conf.d/https.conf
```

修改 `https.conf`：

```text
server_name example.com www.example.com;
ssl_certificate /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;
```

把证书放到：

```text
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
```

然后重载：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d nginx
```

如果需要强制 HTTP 跳转 HTTPS，可以把 `default.conf` 的 HTTP server 改为 `return 301 https://$host$request_uri;`，但必须保留 `/healthz` 或在负载均衡器中同步调整健康检查。

## 11. 日志查看

容器日志：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f nginx
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api-core
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
```

宿主机日志目录：

```text
deploy/data/logs/api-core/requests.log
deploy/data/logs/api-core/errors.log
deploy/data/logs/nginx/access.log
deploy/data/logs/nginx/error.log
```

日志中不应记录 `DATABASE_URL`、JWT Secret、支付密钥、AI Provider Key。

## 12. 备份恢复

备份：

```bash
DATABASE_URL="postgresql://aisaas:数据库密码@127.0.0.1:7347/aisaas?schema=public" \
scripts/backup-postgres.sh /data/backups/aisaas-postgres
```

恢复：

```bash
CONFIRM_RESTORE=YES \
DATABASE_URL="postgresql://aisaas:数据库密码@127.0.0.1:7347/aisaas?schema=public" \
scripts/restore-postgres.sh /data/backups/aisaas-postgres/aisaas-YYYYMMDD-HHMMSS.dump
```

更多说明见 `docs/ops/database-backup.md`。

## 13. 验证

容器状态：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

健康检查：

```bash
curl -i https://example.com/api/health
curl -i https://example.com/api/health/db
curl -i https://example.com/api/health/redis
```

前台验证：

```text
https://example.com/
https://example.com/articles
https://example.com/admin/login
```

后台验证：

1. 使用 `.env.production` 中的 `DEFAULT_ADMIN_EMAIL` 和 `DEFAULT_ADMIN_PASSWORD` 登录后台。
2. 创建文章分类。
3. 创建文章草稿。
4. 发布文章。
5. 在前台文章列表中确认可访问。

## 14. 回滚

回滚不是重新构建旧代码，而是部署上一个已发布的不可变镜像版本：

```bash
scripts/release/deploy.sh 0.0.0
```

如果回滚前已经执行了数据库 migration，先判断 migration 是否向后兼容。若不兼容，按上线前备份恢复数据库，再部署旧版本镜像。

## 15. 常见问题

### 容器启动后管理员无法登录

检查 `.env.production` 中是否设置了 `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`，并确认已执行 seed。

### `/api/health/redis` 返回 Redis 配置缺失

检查 `REDIS_URL` 是否存在，生产默认应为：

```text
redis://redis:7348
```

### Nginx HTTPS 启动失败

检查证书路径是否和 `https.conf` 一致，并确认 `deploy/certs/` 已挂载到 `/etc/nginx/certs`。

### Migration 失败

停止部署，不要 reset 数据库。先保存日志，再根据 `docs/ops/database-backup.md` 执行恢复或手工修复。
