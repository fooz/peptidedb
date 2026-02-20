export function capitalizeLeadingLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const firstLetterIndex = trimmed.search(/[A-Za-z]/);
  if (firstLetterIndex < 0) {
    return trimmed;
  }

  const firstLetter = trimmed[firstLetterIndex];
  const upper = firstLetter.toUpperCase();
  if (firstLetter === upper) {
    return trimmed;
  }

  return `${trimmed.slice(0, firstLetterIndex)}${upper}${trimmed.slice(firstLetterIndex + 1)}`;
}
