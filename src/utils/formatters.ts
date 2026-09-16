import { Transaction } from '../types';

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
      } else {
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
        } else {
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
          else dayTotalOut += tx.amount;
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
