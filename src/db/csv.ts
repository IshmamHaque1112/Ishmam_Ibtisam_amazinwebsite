// Minimal RFC 4180 CSV parser: handles quoted fields, commas and "" escapes
// inside quotes, and \r\n or \n line endings.
export const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some(value => value !== '')) rows.push(row);

  const [header, ...body] = rows;
  if (!header) return [];
  return body.map(values =>
    Object.fromEntries(header.map((key, index) => [key.trim(), (values[index] ?? '').trim()]))
  );
};
