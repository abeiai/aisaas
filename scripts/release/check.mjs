#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const defaultDatabaseUrl = "postgresql://aisaas:aisaas_dev_password@localhost:7344/aisaas?schema=public";
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || defaultDatabaseUrl
};
const failures = [];

console.log("开始执行 Starter Kit 发布检查。");

runCommand("lint", "pnpm", ["lint"]);
runCommand("typecheck", "pnpm", ["typecheck"]);
runCommand("test", "pnpm", ["test"]);
runCommand("build", "pnpm", ["build"]);
runCommand("migration status", "pnpm", [
  "--filter",
  "@aisaas/database",
  "exec",
  "prisma",
  "migrate",
  "status",
  "--schema",
  "prisma/schema.prisma"
]);

await checkEnvExamples();
await checkCommittedEnvFiles();
await checkSensitivePatterns();
await checkConsoleSecretLeaks();
await checkBlockingTodos();

if (failures.length > 0) {
  console.error("\n发布检查失败：");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("\n发布检查通过。");

function runCommand(label, command, args) {
  console.log(`\n检查：${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    failures.push(`${label} 未通过`);
  } else {
    console.log(`通过：${label}`);
  }
}

async function checkEnvExamples() {
  console.log("\n检查：env example 完整性");
  const requiredKeys = [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "SECRET_ENCRYPTION_KEY",
    "DEFAULT_ADMIN_EMAIL",
    "DEFAULT_ADMIN_PASSWORD",
    "APP_BASE_URL",
    "API_BASE_URL",
    "PUBLIC_API_BASE_URL",
    "ALIPAY_APP_ID",
    "WECHAT_PAY_MCH_ID",
    "AI_PROVIDER_API_KEY",
    "ENABLE_MOCK_PAYMENT_NOTIFY"
  ];
  const files = [".env.example", ".env.production.example"];

  for (const file of files) {
    const keys = parseEnvKeys(await readFile(path.join(root, file), "utf8"));
    const missing = requiredKeys.filter((key) => !keys.has(key));

    if (missing.length > 0) {
      failures.push(`${file} 缺少环境变量：${missing.join(", ")}`);
    }
  }

  console.log("完成：env example 完整性");
}

async function checkCommittedEnvFiles() {
  console.log("\n检查：真实 .env 文件");
  const committedEnvFiles = [".env", ".env.local", ".env.production"].filter((file) =>
    existsSync(path.join(root, file))
  );

  if (committedEnvFiles.length > 0) {
    failures.push(`工作区存在真实环境变量文件：${committedEnvFiles.join(", ")}。请确认未提交真实密钥。`);
  }

  console.log("完成：真实 .env 文件");
}

async function checkSensitivePatterns() {
  console.log("\n检查：硬编码密钥与真实支付信息");
  const findings = [];
  const patterns = [
    {
      name: "疑似真实 OpenAI API Key",
      pattern: /\bsk-(?:live|proj)-[A-Za-z0-9_-]{20,}\b/
    },
    {
      name: "疑似 AWS Access Key",
      pattern: /\bAKIA[0-9A-Z]{16}\b/
    },
    {
      name: "疑似 Stripe Live Key",
      pattern: /\b(?:sk|pk)_live_[A-Za-z0-9]{20,}\b/
    },
    {
      name: "疑似真实支付商户号",
      pattern: /\b(?:WECHAT_PAY_MCH_ID|ALIPAY_APP_ID)\s*[:=]\s*["']?\d{8,}["']?/
    }
  ];

  for (const file of await sourceFiles()) {
    const content = await readFile(file, "utf8");

    for (const item of patterns) {
      if (item.pattern.test(content)) {
        findings.push(`${relative(file)}：${item.name}`);
      }
    }
  }

  if (findings.length > 0) {
    failures.push(`发现疑似硬编码密钥或真实支付信息：${findings.join("；")}`);
  }

  console.log("完成：硬编码密钥与真实支付信息");
}

async function checkConsoleSecretLeaks() {
  console.log("\n检查：console 输出泄露风险");
  const findings = [];
  const secretWords = /(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL|API_KEY|JWT)/i;

  for (const file of await sourceFiles()) {
    const lines = (await readFile(file, "utf8")).split("\n");

    lines.forEach((line, index) => {
      if (/console\.(?:log|warn|error)/.test(line) && secretWords.test(line)) {
        findings.push(`${relative(file)}:${index + 1}`);
      }
    });
  }

  if (findings.length > 0) {
    failures.push(`发现可能输出敏感字段的 console：${findings.join(", ")}`);
  }

  console.log("完成：console 输出泄露风险");
}

async function checkBlockingTodos() {
  console.log("\n检查：TODO 阻塞项");
  const findings = [];

  for (const file of await sourceFiles(["apps", "packages", "scripts"])) {
    if (relative(file) === "scripts/release/check.mjs") {
      continue;
    }

    const lines = (await readFile(file, "utf8")).split("\n");

    lines.forEach((line, index) => {
      if (/\b(?:TODO|FIXME|BLOCKER)\b|阻塞项/.test(line)) {
        findings.push(`${relative(file)}:${index + 1}`);
      }
    });
  }

  if (findings.length > 0) {
    failures.push(`发现未处理的 TODO/FIXME/BLOCKER：${findings.join(", ")}`);
  }

  console.log("完成：TODO 阻塞项");
}

function parseEnvKeys(content) {
  return new Set(
    content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=")[0].trim())
  );
}

async function sourceFiles(roots = ["apps", "packages", "scripts", "docs", "."]) {
  const files = [];
  const rootSet = new Set(roots);

  for (const entry of rootSet) {
    const fullPath = path.join(root, entry);

    if (existsSync(fullPath)) {
      await collectFiles(fullPath, files);
    }
  }

  return files;
}

async function collectFiles(current, files) {
  const entries = await readdir(current, {
    withFileTypes: true
  });
  const ignoredDirs = new Set(["node_modules", ".next", "dist", "build", "coverage", "generated", ".git", ".playwright-mcp"]);
  const allowedExt = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".sh",
    ".yml",
    ".yaml",
    ".example"
  ]);

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await collectFiles(fullPath, files);
      }
      continue;
    }

    if (entry.isFile() && (allowedExt.has(path.extname(entry.name)) || entry.name.startsWith(".env"))) {
      files.push(fullPath);
    }
  }
}

function relative(file) {
  return path.relative(root, file);
}
