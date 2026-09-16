import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Category, Debt, Goal } from '../types';
import { formatCurrency } from './formatters';

interface ExportPdfOptions {
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  goals: Goal[];
  currentSavings: number;
  totalIncome: number;
  totalExpense: number;
  currencySymbol: string;
}

export function generateBudgetPdf({
  transactions,
  categories,
  debts,
  goals,
  currentSavings,
  totalIncome,
  totalExpense,
  currencySymbol,
}: ExportPdfOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Category map for quick lookup
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // --- Document Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27); // zinc-900
  doc.text('BUDGET TRACKER REPORT', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text(`Generated: ${dateFormatted} at ${timeFormatted}`, 14, 26);
  doc.text(`Currency: ${currencySymbol}`, 14, 31);

  // Line divider
  doc.setDrawColor(228, 228, 231); // zinc-200
  doc.setLineWidth(0.4);
  doc.line(14, 35, 196, 35);

  // --- Financial Summary Highlights ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text('EXECUTIVE FINANCIAL SUMMARY', 14, 43);

  const debtsYouOwe = debts.filter((d) => d.type === 'owe' && !d.settled).reduce((s, d) => s + d.amount, 0);
  const debtsOwedToYou = debts.filter((d) => d.type === 'owed' && !d.settled).reduce((s, d) => s + d.amount, 0);

  const summaryData = [
    [
      'Current Net Savings',
      formatCurrency(currentSavings, currencySymbol),
      'Total Recorded Inflow',
      formatCurrency(totalIncome, currencySymbol),
    ],
    [
      'Total Recorded Outflow',
      formatCurrency(totalExpense, currencySymbol),
      'Active Debts You Owe',
      formatCurrency(debtsYouOwe, currencySymbol),
    ],
    [
      'Active Debts Owed to You',
      formatCurrency(debtsOwedToYou, currencySymbol),
      'Total Logged Transactions',
      transactions.length.toString(),
    ],
  ];

  autoTable(doc, {
    startY: 46,
    body: summaryData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      textColor: [39, 39, 42],
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], cellWidth: 50 },
      1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 41 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], cellWidth: 50 },
      3: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 41 },
    },
    tableWidth: 182,
    margin: { left: 14 },
  });

  // --- Transactions Section ---
  const lastY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 75;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text('TRANSACTION HISTORY', 14, lastY1 + 10);

  // Sort transactions by date and time descending
  const sortedTransactions = [...transactions].sort((a, b) => {
    return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
  });

  const txRows = sortedTransactions.map((tx) => [
    `${tx.date} ${tx.time}`,
    tx.type === 'income' ? 'INCOME' : 'EXPENSE',
    categoryMap.get(tx.categoryId) || 'General',
    tx.note || '-',
    `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount, currencySymbol)}`,
  ]);

  autoTable(doc, {
    startY: lastY1 + 13,
    head: [['Date & Time', 'Type', 'Category', 'Description', 'Amount']],
    body: txRows.length > 0 ? txRows : [['No transactions recorded', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 20 },
      2: { cellWidth: 32 },
      3: { cellWidth: 68 },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [16, 149, 93]; // Emerald
        } else if (text.startsWith('-')) {
          data.cell.styles.textColor = [24, 24, 27]; // Black/zinc
        }
      }
    },
    tableWidth: 182,
    margin: { left: 14 },
  });

  // --- Debts Summary Section ---
  if (debts.length > 0) {
    const lastY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 150;
    
    // Check if we need a new page
    let startDebtY = lastY2 + 10;
    if (startDebtY > 240) {
      doc.addPage();
      startDebtY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text('DEBTS SUMMARY', 14, startDebtY);

    const debtRows = debts.map((d) => [
      d.person,
      d.type === 'owe' ? 'You Owe' : 'Owed to You',
      formatCurrency(d.amount, currencySymbol),
      d.settled ? 'Settled' : 'Active',
      d.dueDate || '-',
      d.note || '-',
    ]);

    autoTable(doc, {
      startY: startDebtY + 3,
      head: [['Party / Person', 'Direction', 'Amount', 'Status', 'Due Date', 'Notes']],
      body: debtRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 28, fontStyle: 'bold', halign: 'right' },
        3: { cellWidth: 20 },
        4: { cellWidth: 24 },
        5: { cellWidth: 50 },
      },
      tableWidth: 182,
      margin: { left: 14 },
    });
  }

  // --- Purchase Goals Section ---
  if (goals.length > 0) {
    const lastY3 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 200;
    
    let startGoalY = lastY3 + 10;
    if (startGoalY > 240) {
      doc.addPage();
      startGoalY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text('PURCHASE GOALS', 14, startGoalY);

    const goalRows = goals.map((g) => [
      g.name,
      formatCurrency(g.targetPrice, currencySymbol),
      g.plannedDate || '-',
      g.isAchieved ? 'Achieved' : 'In Progress',
      g.notes || '-',
    ]);

    autoTable(doc, {
      startY: startGoalY + 3,
      head: [['Goal Item', 'Target Price', 'Target Date', 'Status', 'Notes']],
      body: goalRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30, fontStyle: 'bold', halign: 'right' },
        2: { cellWidth: 27 },
        3: { cellWidth: 25 },
        4: { cellWidth: 55 },
      },
      tableWidth: 182,
      margin: { left: 14 },
    });
  }

  // Page Numbers Footer
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text(
      `Budget Tracker Report - Page ${i} of ${pageCount}`,
      14,
      287
    );
  }

  // Save the PDF
  const filename = `budget_tracker_report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
