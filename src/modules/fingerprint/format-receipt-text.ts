import type { ReceiptRow } from '../../ui/receipt';

export function formatReceiptText(title: string, rows: ReceiptRow[]): string {
  const lines: string[] = [
    title,
    '─'.repeat(title.length),
  ];

  for (const row of rows) {
    lines.push(`${row.label}: ${row.value}`);
  }

  return lines.join('\n');
}
