#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

VERSION="${1:-${VERSION:-}}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

if [[ -z "${VERSION}" ]]; then
  echo "用法：scripts/release/deploy.sh <version>"
  exit 1
fi

if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.-]+)?$ ]]; then
  echo "错误：版本号不合法：${VERSION}"
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "错误：生产 Compose 文件不存在：${COMPOSE_FILE}"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "错误：生产环境变量文件不存在：${ENV_FILE}"
  echo "请先复制 .env.production.example 为 .env.production 并填入真实生产配置。"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "错误：未找到 docker。"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

IMAGE_REGISTRY="${IMAGE_REGISTRY:-registry.example.com}"
IMAGE_NAMESPACE="${IMAGE_NAMESPACE:-aisaas}"
IMAGE_PROJECT="${IMAGE_PROJECT:-aisaas}"

WEB_IMAGE="${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_PROJECT}:web-${VERSION}"
API_CORE_IMAGE="${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_PROJECT}:api-core-${VERSION}"
AI_GATEWAY_IMAGE="${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_PROJECT}:ai-gateway-${VERSION}"

run() {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

compose() {
  WEB_IMAGE="${WEB_IMAGE}" \
  API_CORE_IMAGE="${API_CORE_IMAGE}" \
  AI_GATEWAY_IMAGE="${AI_GATEWAY_IMAGE}" \
  APP_VERSION="${VERSION}" \
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

echo "部署版本：${VERSION}"
echo "Compose 文件：${COMPOSE_FILE}"
echo "环境变量文件：${ENV_FILE}"
echo "镜像标签："
echo "  web:        ${WEB_IMAGE}"
echo "  api-core:   ${API_CORE_IMAGE}"
echo "  ai-gateway: ${AI_GATEWAY_IMAGE}"

run mkdir -p deploy/data/logs/api-core deploy/data/logs/nginx deploy/data/uploads

run compose down --remove-orphans

run compose pull web api-core ai-gateway
run compose up -d postgres redis
run compose run --rm api-core pnpm --filter @aisaas/database db:migrate:deploy

if [[ "${RUN_SEED:-0}" == "1" ]]; then
  run compose run --rm api-core pnpm --filter @aisaas/database db:seed
fi

run compose up -d nginx web api-core ai-gateway postgres redis
run compose ps

echo "部署流程完成。"
