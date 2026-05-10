#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

VERSION="${VERSION:-$(node -p "require('./package.json').version")}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-registry.example.com}"
IMAGE_NAMESPACE="${IMAGE_NAMESPACE:-aisaas}"
IMAGE_PROJECT="${IMAGE_PROJECT:-aisaas}"
PLATFORM="${PLATFORM:-linux/amd64}"

if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.-]+)?$ ]]; then
  echo "错误：版本号不合法：${VERSION}"
  exit 1
fi

if [[ -z "${IMAGE_REGISTRY}" || -z "${IMAGE_NAMESPACE}" || -z "${IMAGE_PROJECT}" ]]; then
  echo "错误：请配置 IMAGE_REGISTRY、IMAGE_NAMESPACE 和 IMAGE_PROJECT。"
  exit 1
fi

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

echo "发布版本：${VERSION}"
echo "镜像标签："
echo "  web:        ${WEB_IMAGE}"
echo "  api-core:   ${API_CORE_IMAGE}"
echo "  ai-gateway: ${AI_GATEWAY_IMAGE}"

run docker buildx build \
  --platform "${PLATFORM}" \
  --file apps/web/Dockerfile \
  --build-arg "APP_VERSION=${VERSION}" \
  --tag "${WEB_IMAGE}" \
  --push \
  .

run docker buildx build \
  --platform "${PLATFORM}" \
  --file apps/api-core/Dockerfile \
  --tag "${API_CORE_IMAGE}" \
  --push \
  .

run docker buildx build \
  --platform "${PLATFORM}" \
  --file apps/ai-gateway/Dockerfile \
  --tag "${AI_GATEWAY_IMAGE}" \
  --push \
  .

echo "发布流程完成。"
