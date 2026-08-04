/** Gera slug amigável (1º e 2º nome) como no O Candidato. */

function slugifyPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function nameSlugBase(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return slugifyPart(`${parts[0]} ${parts[1]}`) || "lideranca";
  if (parts.length === 1) return slugifyPart(parts[0]) || "lideranca";
  return "lideranca";
}

export function accountSlugBase(name: string): string {
  return slugifyPart(name) || "conta";
}

/** Garante slug único dado um conjunto de slugs já usados. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base.slice(0, 60) || "item";
  let n = 2;
  while (taken.has(slug)) {
    const suffix = `-${n}`;
    slug = `${base.slice(0, Math.max(1, 60 - suffix.length))}${suffix}`;
    n += 1;
  }
  return slug;
}
