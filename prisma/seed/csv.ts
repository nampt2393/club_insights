import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

export function readCsv(filePath: string): Record<string, string>[] {
  return parse(readFileSync(filePath, 'utf8'), { columns: true, bom: true, skip_empty_lines: true });
}
