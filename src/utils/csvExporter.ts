export interface CustomerStatementData {
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  total_outstanding: number;
  current_due: number;
  overdue_amount: number;
  days_overdue: number;
  last_payment_date?: string;
  last_payment_amount?: number;
  invoice_count: number;
}

export const exportCustomerStatementsToCSV = (statements: CustomerStatementData[], filename?: string) => {
  const headers = [
    'Customer Name',
    'Email',
    'Total Outstanding',
    'Current Due',
    'Overdue Amount',
    'Days Overdue',
    'Last Payment Date',
    'Last Payment Amount',
    'Invoice Count'
  ];

  const csvData = statements.map(statement => [
    statement.customer_name,
    statement.customer_email || '',
    statement.total_outstanding.toFixed(2),
    statement.current_due.toFixed(2),
    statement.overdue_amount.toFixed(2),
    statement.days_overdue.toString(),
    statement.last_payment_date ? new Date(statement.last_payment_date).toLocaleDateString() : '',
    statement.last_payment_amount ? statement.last_payment_amount.toFixed(2) : '',
    statement.invoice_count.toString()
  ]);

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `customer-statements-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportCustomerStatementSummaryToCSV = (statements: CustomerStatementData[], filename?: string) => {
  const totalOutstanding = statements.reduce((sum, s) => sum + s.total_outstanding, 0);
  const totalOverdue = statements.reduce((sum, s) => sum + s.overdue_amount, 0);
  const totalCurrent = statements.reduce((sum, s) => sum + s.current_due, 0);
  const overdueCustomers = statements.filter(s => s.overdue_amount > 0).length;

  const summaryData = [
    ['Customer Statements Summary', ''],
    ['Generated Date', new Date().toLocaleDateString()],
    ['', ''],
    ['Total Customers', statements.length.toString()],
    ['Total Outstanding', `$${totalOutstanding.toFixed(2)}`],
    ['Total Current Due', `$${totalCurrent.toFixed(2)}`],
    ['Total Overdue', `$${totalOverdue.toFixed(2)}`],
    ['Customers with Overdue', overdueCustomers.toString()],
    ['', ''],
    ['Customer Details:', ''],
    ['Customer Name', 'Total Outstanding', 'Current Due', 'Overdue Amount', 'Days Overdue', 'Status'],
    ...statements.map(s => [
      s.customer_name,
      `$${s.total_outstanding.toFixed(2)}`,
      `$${s.current_due.toFixed(2)}`,
      `$${s.overdue_amount.toFixed(2)}`,
      s.days_overdue.toString(),
      s.total_outstanding === 0 ? 'Paid Up' : s.overdue_amount > 0 ? 'Overdue' : 'Current'
    ])
  ];

  const csvContent = summaryData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `customer-statements-summary-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
