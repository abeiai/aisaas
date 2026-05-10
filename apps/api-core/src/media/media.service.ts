import { createHash, createHmac, randomBytes } from "node:crypto";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { HttpStatus, Injectable } from "@nestjs/common";
import { getPrismaClient } from "@aisaas/database";
import { AppException } from "../common/app-exception.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class MediaService {
  private readonly prisma = getPrismaClient();

  async listAssets() {
    const assets = await this.prisma.mediaAsset.findMany({
      include: {
        createdByAdmin: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    return assets.map((asset) => ({
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.size,
      url: asset.url,
      storageProvider: asset.storageProvider,
      createdByAdminId: asset.createdByAdminId,
      createdByAdmin: asset.createdByAdmin,
      createdAt: asset.createdAt
    }));
  }

  async uploadFile(adminUserId: string, file: UploadedFileLike | undefined) {
    if (!file) {
      throw new AppException(40001, "请选择要上传的文件", HttpStatus.BAD_REQUEST);
    }

    this.assertAllowedFile(file);

    const filename = this.createFilename(file.originalname, file.mimetype);
    const provider = uploadDriver() === "s3" ? "S3" : "LOCAL";
    const url =
      provider === "S3"
        ? await this.uploadToS3(filename, file)
        : await this.uploadToLocal(filename, file);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        storageProvider: provider,
        createdByAdminId: adminUserId
      },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return {
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.size,
      url: asset.url,
      storageProvider: asset.storageProvider,
      createdByAdminId: asset.createdByAdminId,
      createdByAdmin: asset.createdByAdmin,
      createdAt: asset.createdAt
    };
  }

  async getLocalFile(filename: string) {
    const safeFilename = basename(filename);
    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        filename: safeFilename,
        storageProvider: "LOCAL"
      }
    });

    if (!asset) {
      throw new AppException(40401, "媒体文件不存在", HttpStatus.NOT_FOUND);
    }

    const filepath = resolve(uploadDir(), safeFilename);

    if (!filepath.startsWith(uploadDir()) || !existsSync(filepath)) {
      throw new AppException(40401, "媒体文件不存在", HttpStatus.NOT_FOUND);
    }

    return {
      filepath,
      mimeType: asset.mimeType,
      size: asset.size
    };
  }

  private assertAllowedFile(file: UploadedFileLike) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new AppException(40001, "仅支持 JPG、PNG、WebP、GIF 图片", HttpStatus.BAD_REQUEST);
    }

    if (file.size <= 0 || file.size > maxUploadBytes()) {
      throw new AppException(40001, `文件大小不能超过 ${Math.floor(maxUploadBytes() / 1024 / 1024)}MB`, HttpStatus.BAD_REQUEST);
    }
  }

  private createFilename(originalName: string, mimeType: string) {
    const extension = extensionFor(originalName, mimeType);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const hash = randomBytes(8).toString("hex");

    return `${date}-${hash}${extension}`;
  }

  private async uploadToLocal(filename: string, file: UploadedFileLike) {
    const directory = uploadDir();
    mkdirSync(directory, {
      recursive: true
    });
    await writeFile(join(directory, filename), file.buffer);

    return `${publicApiBaseUrl()}/media/files/${filename}`;
  }

  private async uploadToS3(filename: string, file: UploadedFileLike) {
    const config = s3Config();
    const key = `${config.prefix}${filename}`;
    const endpoint = config.endpoint.replace(/\/+$/, "");
    const url = config.pathStyle
      ? `${endpoint}/${config.bucket}/${key}`
      : `${endpoint.replace("://", `://${config.bucket}.`)}/${key}`;
    const parsedUrl = new URL(url);
    const amzDate = amzTimestamp(new Date());
    const payloadHash = createHash("sha256").update(file.buffer).digest("hex");
    const headers: Record<string, string> = {
      "content-type": file.mimetype,
      host: parsedUrl.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    };
    const authorization = signS3Request({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      method: "PUT",
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      headers,
      payloadHash,
      amzDate
    });
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        authorization
      },
      body: file.buffer
    });

    if (!response.ok) {
      throw new AppException(50002, "对象存储上传失败", HttpStatus.BAD_GATEWAY);
    }

    return config.publicBaseUrl
      ? `${config.publicBaseUrl.replace(/\/+$/, "")}/${key}`
      : url;
  }
}

export function localMediaStream(filepath: string) {
  return createReadStream(filepath);
}

function uploadDriver() {
  const driver = (process.env.UPLOAD_DRIVER ?? "local").trim().toLowerCase();

  return driver === "s3" || driver === "s3-compatible" ? "s3" : "local";
}

function uploadDir() {
  return resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads"));
}

function publicApiBaseUrl() {
  return (process.env.PUBLIC_API_BASE_URL ?? process.env.API_PUBLIC_BASE_URL ?? "http://localhost:7342/api").replace(/\/+$/, "");
}

function maxUploadBytes() {
  const value = Number(process.env.MEDIA_UPLOAD_MAX_BYTES ?? 2 * 1024 * 1024);

  return Number.isFinite(value) && value > 0 ? value : 2 * 1024 * 1024;
}

function extensionFor(originalName: string, mimeType: string) {
  const extension = extname(originalName).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  const byMimeType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
  };

  return byMimeType[mimeType] ?? ".bin";
}

function s3Config() {
  const endpoint = requiredEnv("S3_ENDPOINT");
  const bucket = requiredEnv("S3_BUCKET");
  const region = process.env.S3_REGION || "auto";
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");
  const prefix = (process.env.S3_KEY_PREFIX ?? "uploads/").replace(/^\/+/, "");

  return {
    endpoint,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
    pathStyle: process.env.S3_FORCE_PATH_STYLE !== "0",
    prefix: prefix && !prefix.endsWith("/") ? `${prefix}/` : prefix
  };
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new AppException(50001, `对象存储配置缺失：${name}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  return value;
}

function amzTimestamp(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signS3Request(input: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  method: string;
  pathname: string;
  search: string;
  headers: Record<string, string>;
  payloadHash: string;
  amzDate: string;
}) {
  const date = input.amzDate.slice(0, 8);
  const signedHeaders = Object.keys(input.headers).sort().join(";");
  const canonicalHeaders = Object.keys(input.headers)
    .sort()
    .map((key) => `${key}:${input.headers[key]}`)
    .join("\n");
  const canonicalRequest = [
    input.method,
    encodeURI(input.pathname),
    input.search.replace(/^\?/, ""),
    `${canonicalHeaders}\n`,
    signedHeaders,
    input.payloadHash
  ].join("\n");
  const credentialScope = `${date}/${input.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    input.amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, date), input.region), "s3"),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}
