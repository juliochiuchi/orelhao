export function buildTypingLabel(rawNames: string[]) {
  const names = Array.from(new Set(rawNames.map(name => name.trim()).filter(Boolean)))
  const count = names.length
  if (count === 0) return ""
  if (count === 1) return `${names[0]} está digitando...`
  if (count === 2) return `${names[0]} e ${names[1]} estão digitando...`
  if (count === 3) return `${names[0]}, ${names[1]} e ${names[2]} estão digitando...`
  return `${names[0]}, ${names[1]} e mais ${count - 2} pessoas estão digitando...`
}
