import { Transaction, Account } from '../types';

export function formatCurrency(amount: number, symbol: string = '₱'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function formatCurrencySimple(amount: number, symbol: string = '₱'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function getCurrent12HourTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DayGroup {
  date: string; // '2026-09-01'
  displayDate: string; // 'Sep 1'
  dayOfWeek: string; // 'Tue'
  transactions: Transaction[];
  dayTotalIn: number;
  dayTotalOut: number;
}

export interface WeekGroup {
  weekNumber: number; // 1, 2, 3, etc.
  weekLabel: string; // 'Week 1'
  days: DayGroup[];
  weekTotalIn: number;
  weekTotalOut: number;
}

export interface MonthGroup {
  yearMonth: string; // '2026-09'
  monthLabel: string; // 'Sep 2026'
  weeks: WeekGroup[];
  monthTotalIn: number;
  monthTotalOut: number;
}

/**
 * Calculates week of the month (1-indexed).
 * Using standard 7-day brackets: days 1-7 = Week 1, 8-14 = Week 2, 15-21 = Week 3, 22-28 = Week 4, 29+ = Week 5
 * This matches the spec where Sep 1 is Week 1 and Sep 8 is Week 2.
 */
export function getWeekOfMonth(day: number): number {
  return Math.min(5, Math.floor((day - 1) / 7) + 1);
}

export function groupTransactions(transactions: Transaction[]): MonthGroup[] {
  // Sort descending by date and timestamp
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.timestamp - a.timestamp;
  });

  const monthMap = new Map<string, Transaction[]>();

  sorted.forEach((tx) => {
    const yearMonth = tx.date.slice(0, 7); // '2026-09'
    if (!monthMap.has(yearMonth)) {
      monthMap.set(yearMonth, []);
    }
    monthMap.get(yearMonth)!.push(tx);
  });

  const monthGroups: MonthGroup[] = [];

  monthMap.forEach((txList, yearMonth) => {
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const dateObj = new Date(year, month, 1);
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    let monthTotalIn = 0;
    let monthTotalOut = 0;

    // Group by week
    const weekMap = new Map<number, Transaction[]>();
    txList.forEach((tx) => {
      const day = parseInt(tx.date.slice(8, 10), 10);
      const weekNum = getWeekOfMonth(day);
      if (!weekMap.has(weekNum)) {
        weekMap.set(weekNum, []);
      }
      weekMap.get(weekNum)!.push(tx);

      if (tx.type === 'income') {
        monthTotalIn += tx.amount;
      } else if (tx.type === 'expense') {
        monthTotalOut += tx.amount;
      }
    });

    const weeks: WeekGroup[] = [];
    const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => b - a); // Higher week first

    sortedWeeks.forEach((weekNum) => {
      const weekTxList = weekMap.get(weekNum)!;
      let weekTotalIn = 0;
      let weekTotalOut = 0;

      // Group by day
      const dayMap = new Map<string, Transaction[]>();
      weekTxList.forEach((tx) => {
        if (!dayMap.has(tx.date)) {
          dayMap.set(tx.date, []);
        }
        dayMap.get(tx.date)!.push(tx);

        if (tx.type === 'income') {
          weekTotalIn += tx.amount;
        } else if (tx.type === 'expense') {
          weekTotalOut += tx.amount;
        }
      });

      const days: DayGroup[] = [];
      const sortedDays = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));

      sortedDays.forEach((dateKey) => {
        const dayTxList = dayMap.get(dateKey)!;
        const [y, m, d] = dateKey.split('-').map(Number);
        const dayDate = new Date(y, m - 1, d);
        const displayDate = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'short' });

        let dayTotalIn = 0;
        let dayTotalOut = 0;
        dayTxList.forEach((tx) => {
          if (tx.type === 'income') dayTotalIn += tx.amount;
          else if (tx.type === 'expense') dayTotalOut += tx.amount;
        });

        days.push({
          date: dateKey,
          displayDate,
          dayOfWeek,
          transactions: dayTxList,
          dayTotalIn,
          dayTotalOut,
        });
      });

      weeks.push({
        weekNumber: weekNum,
        weekLabel: `Week ${weekNum}`,
        days,
        weekTotalIn,
        weekTotalOut,
      });
    });

    monthGroups.push({
      yearMonth,
      monthLabel,
      weeks,
      monthTotalIn,
      monthTotalOut,
    });
  });

  return monthGroups;
}

/**
 * Consolidates legacy paired transfer records (IN and OUT entries) into a single transfer entry.
 */
export function consolidateTransactions(rawList: Transaction[], accountsList: Account[] = []): Transaction[] {
  if (!Array.isArray(rawList)) return [];

  const result: Transaction[] = [];
  const processedToIds = new Set<string>();

  const getAccount = (id?: string, name?: string) => {
    if (id) {
      const found = accountsList.find((a) => a.id === id);
      if (found) return found;
    }
    if (name) {
      const found = accountsList.find((a) => a.name.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    return undefined;
  };

  for (let i = 0; i < rawList.length; i++) {
    const tx = rawList[i];
    if (processedToIds.has(tx.id)) continue;

    // Already a consolidated transfer entry
    if (tx.type === 'transfer') {
      const fromAcc = getAccount(tx.fromAccountId || tx.accountId, tx.fromAccountName);
      const toAcc = getAccount(tx.toAccountId, tx.toAccountName);
      result.push({
        ...tx,
        fromAccountId: tx.fromAccountId || tx.accountId,
        fromAccountName: fromAcc?.name || tx.fromAccountName || tx.accountName || 'Account 1',
        toAccountName: toAcc?.name || tx.toAccountName || 'Account 2',
        fromAccountIcon: fromAcc?.icon || tx.fromAccountIcon || tx.accountIcon || 'Wallet',
        toAccountIcon: toAcc?.icon || tx.toAccountIcon || 'Wallet',
      });
      continue;
    }

    // Check if legacy transfer out entry (e.g. id starts with "tx-transfer-out-" or note starts with "Transfer to ")
    const isLegacyOut =
      tx.id.startsWith('tx-transfer-out-') ||
      (tx.type === 'expense' && (tx.categoryName?.toLowerCase() === 'transfer' || tx.note?.toLowerCase().startsWith('transfer to ')));

    if (isLegacyOut) {
      // Find matching legacy 'in' transaction
      let matchingInIndex = -1;
      for (let j = 0; j < rawList.length; j++) {
        if (j === i || processedToIds.has(rawList[j].id)) continue;
        const other = rawList[j];
        if (
          other.type === 'income' &&
          (other.id.startsWith('tx-transfer-in-') || other.categoryName?.toLowerCase() === 'transfer' || other.note?.toLowerCase().startsWith('transfer from ')) &&
          Math.abs(other.amount - tx.amount) < 0.001 &&
          other.date === tx.date
        ) {
          matchingInIndex = j;
          break;
        }
      }

      const matchingIn = matchingInIndex !== -1 ? rawList[matchingInIndex] : undefined;
      if (matchingIn) {
        processedToIds.add(matchingIn.id);
      }

      // Extract destination account & clean note
      let toAccId = matchingIn?.accountId || '';
      let toAccName = matchingIn?.accountName || '';

      // Clean note if it had "Transfer to [Account]: " prefix
      let cleanNote = tx.note || '';
      const toMatch = cleanNote.match(/^Transfer to ([^:]+)(?::\s*(.*))?$/i);
      if (toMatch) {
        if (!toAccName) toAccName = toMatch[1].trim();
        cleanNote = (toMatch[2] || '').trim();
      }

      if (!toAccId && toAccName) {
        const found = accountsList.find((a) => a.name.toLowerCase() === toAccName.toLowerCase());
        if (found) toAccId = found.id;
      }

      const fromAcc = getAccount(tx.accountId, tx.accountName);
      const toAcc = getAccount(toAccId, toAccName);

      const consolidated: Transaction = {
        ...tx,
        id: tx.id.startsWith('tx-transfer-out-') ? tx.id.replace('tx-transfer-out-', 'tx-transfer-') : `tx-transfer-${tx.timestamp}`,
        type: 'transfer',
        fromAccountId: tx.accountId,
        toAccountId: toAcc?.id || toAccId,
        fromAccountName: fromAcc?.name || tx.accountName || 'Account 1',
        toAccountName: toAcc?.name || toAccName || 'Account 2',
        fromAccountIcon: fromAcc?.icon || tx.accountIcon || 'Wallet',
        toAccountIcon: toAcc?.icon || 'Wallet',
        note: cleanNote,
        categoryName: undefined,
        categoryIcon: undefined,
      };

      result.push(consolidated);
      continue;
    }

    // Check if legacy orphan in entry that was not matched
    const isLegacyIn =
      tx.id.startsWith('tx-transfer-in-') ||
      (tx.type === 'income' && tx.categoryName?.toLowerCase() === 'transfer' && tx.note?.toLowerCase().startsWith('transfer from '));
    if (isLegacyIn) {
      continue;
    }

    result.push(tx);
  }

  return result;
}
