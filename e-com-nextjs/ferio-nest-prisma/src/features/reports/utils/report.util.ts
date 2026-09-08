import { BadRequestException } from '@nestjs/common';
import { ReportQueryDto } from '../dto/report-query.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

export function reportPeriod(query: ReportQueryDto, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const defaultFrom = new Date(now.getTime() - 29 * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const dateFrom = query.dateFrom ?? defaultFrom;
  const dateTo = query.dateTo ?? today;
  const from = new Date(`${dateFrom}T00:00:00.000Z`);
  const to = new Date(`${dateTo}T23:59:59.999Z`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new BadRequestException('Report date range is invalid');
  }
  if (to.getTime() - from.getTime() > 366 * DAY_MS) {
    throw new BadRequestException('Report date range cannot exceed 366 days');
  }
  return { dateFrom, dateTo, from, to };
}

export function sumMoney(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function maskExportName(name: string) {
  const firstCharacter = Array.from(name.normalize('NFKC').trim())[0];
  return firstCharacter ? `${firstCharacter}***` : '***';
}

export function csvCell(value: unknown) {
  const scalar =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
      ? value.toString()
      : value instanceof Date
        ? value.toISOString()
        : '';
  const normalized = scalar.replace(/\r?\n/g, ' ').trim();
  const formulaSafe = /^[=+\-@]/.test(normalized)
    ? `'${normalized}`
    : normalized;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}
