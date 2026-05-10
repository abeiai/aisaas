export interface TokenUsage {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
}

export interface UsageCostInput {
  usage?: TokenUsage | null;
  inputPrice: number;
  outputPrice: number;
  fallbackCredits: number;
  maxCredits: number;
  minCredits?: number;
}

export function calculateUsageCredits(input: UsageCostInput) {
  const minCredits = input.minCredits ?? 1;
  const usage = input.usage;

  if (usage && hasTokenUsage(usage)) {
    const inputTokens = positiveNumber(usage.inputTokens);
    const outputTokens = positiveNumber(usage.outputTokens);
    const totalTokens = positiveNumber(usage.totalTokens);
    const effectiveInputTokens = inputTokens || Math.max(0, totalTokens - outputTokens);
    const effectiveOutputTokens = outputTokens;
    const rawCredits =
      (effectiveInputTokens * Math.max(0, input.inputPrice)) / 1000 +
      (effectiveOutputTokens * Math.max(0, input.outputPrice)) / 1000;

    return clampCredits(Math.ceil(rawCredits || minCredits), minCredits, input.maxCredits);
  }

  return clampCredits(Math.ceil(input.fallbackCredits), minCredits, input.maxCredits);
}

export function estimateMockUsageCredits(input: string, estimatedCredits: number) {
  return Math.min(estimatedCredits, Math.max(20, Math.ceil(input.length / 6) + 28));
}

function hasTokenUsage(usage: TokenUsage) {
  return (
    positiveNumber(usage.inputTokens) > 0 ||
    positiveNumber(usage.outputTokens) > 0 ||
    positiveNumber(usage.totalTokens) > 0
  );
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function clampCredits(value: number, minCredits: number, maxCredits: number) {
  return Math.max(minCredits, Math.min(maxCredits, value));
}
