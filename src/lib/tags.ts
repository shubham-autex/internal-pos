const TAG_LIMIT = 20;
const TAG_MAX_LEN = 32;

/** Normalize a free-text tags field into a clean, de-duplicated list. */
export function parseTagsInput(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of raw.split(/[,;]/)) {
    const tag = part.trim().toLowerCase().replace(/\s+/g, " ");
    if (!tag || tag.length > TAG_MAX_LEN || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= TAG_LIMIT) break;
  }

  return tags;
}

export function formatTagsInput(tags: string[] | null | undefined): string {
  return (tags ?? []).join(", ");
}

export function asTagList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return parseTagsInput(value.map((item) => String(item ?? "")).join(", "));
}
