export function getAdminAudioSourceFileUrl(path: string | null) {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:7342/api";

  return path ? `${apiBaseUrl}${path}` : null;
}
