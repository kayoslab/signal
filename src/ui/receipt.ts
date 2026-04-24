export interface ReceiptRow {
  label: string;
  value: string;
}

export function createReceiptRow(label: string, value: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'receipt-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'receipt-row-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'receipt-row-value';
  valueEl.textContent = value;

  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}

export function createReceiptTitle(title: string): HTMLElement {
  const heading = document.createElement('h3');
  heading.className = 'receipt-title';
  heading.textContent = title;
  return heading;
}

export function createReceipt(titleOrRows: string | ReceiptRow[], maybeRows?: ReceiptRow[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'receipt';

  const rows = typeof titleOrRows === 'string' ? maybeRows! : titleOrRows;

  if (typeof titleOrRows === 'string') {
    container.appendChild(createReceiptTitle(titleOrRows));
  }

  const rowsContainer = document.createElement('div');
  rowsContainer.className = 'receipt-rows';
  for (const row of rows) {
    rowsContainer.appendChild(createReceiptRow(row.label, row.value));
  }
  container.appendChild(rowsContainer);

  return container;
}
