import { PriorPostSchema, type PriorPost } from '@/domain/schemas';

function opening(caption: string): string {
  return caption
    .toLocaleLowerCase('sk')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');
}

function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function normalizeRecords(input: string, filename: string): Array<Record<string, unknown>> {
  if (filename.toLocaleLowerCase('en').endsWith('.json')) {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) throw new Error('History JSON must contain an array.');
    return parsed as Array<Record<string, unknown>>;
  }
  if (!filename.toLocaleLowerCase('en').endsWith('.csv')) {
    throw new Error('History import supports only .json and .csv files.');
  }
  const [headers, ...rows] = csvRows(input);
  if (!headers) return [];
  return rows.map(row =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim()])),
  );
}

export function parsePriorPosts(
  input: string,
  filename: string,
  now = new Date(),
): PriorPost[] {
  const importedAt = now.toISOString();
  return normalizeRecords(input, filename).map(record => {
    const caption = String(record.caption ?? '').trim();
    return PriorPostSchema.parse({
      ...record,
      id: String(record.id ?? '').trim(),
      platform: String(record.platform ?? '').trim().toLocaleLowerCase('en'),
      caption,
      opening: opening(caption),
      publishedAt: record.publishedAt || undefined,
      sourceUrl: record.sourceUrl || undefined,
      importedAt,
    });
  });
}
