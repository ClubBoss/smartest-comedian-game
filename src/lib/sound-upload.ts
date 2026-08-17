export type SoundUploadFormat = {
  extension: "mp3" | "wav" | "ogg" | "m4a";
  contentType: string;
};

const MIME_FORMATS = new Map<string, SoundUploadFormat>([
  ["audio/mpeg", { extension: "mp3", contentType: "audio/mpeg" }],
  ["audio/mp3", { extension: "mp3", contentType: "audio/mpeg" }],
  ["audio/wav", { extension: "wav", contentType: "audio/wav" }],
  ["audio/x-wav", { extension: "wav", contentType: "audio/wav" }],
  ["audio/ogg", { extension: "ogg", contentType: "audio/ogg" }],
  ["application/ogg", { extension: "ogg", contentType: "audio/ogg" }],
  ["audio/mp4", { extension: "m4a", contentType: "audio/mp4" }],
  ["audio/m4a", { extension: "m4a", contentType: "audio/mp4" }],
  ["audio/x-m4a", { extension: "m4a", contentType: "audio/mp4" }],
]);

const GENERIC_TYPES = new Set(["", "application/octet-stream"]);

function extensionOf(fileName: string) {
  const match = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function resolveSoundUploadFormat(fileName: string, rawType: string): SoundUploadFormat | null {
  const type = rawType.trim().toLowerCase().split(";", 1)[0];
  const direct = MIME_FORMATS.get(type);
  if (direct) return direct;

  const extension = extensionOf(fileName);

  // Safari / iOS share sheets occasionally surface Voice Memos M4A files as
  // generic MPEG-4 instead of audio/mp4. Only accept that MIME when the file
  // name still proves it is the expected audio container.
  if (type === "application/mp4" && extension === "m4a") {
    return { extension: "m4a", contentType: "audio/mp4" };
  }

  // Some browser/file-provider combinations omit the MIME entirely. Fall back
  // to a strict allow-list by extension only for generic MIME values.
  if (!GENERIC_TYPES.has(type)) return null;
  if (extension === "m4a") return { extension: "m4a", contentType: "audio/mp4" };
  if (extension === "mp3") return { extension: "mp3", contentType: "audio/mpeg" };
  if (extension === "wav") return { extension: "wav", contentType: "audio/wav" };
  if (extension === "ogg") return { extension: "ogg", contentType: "audio/ogg" };
  return null;
}
