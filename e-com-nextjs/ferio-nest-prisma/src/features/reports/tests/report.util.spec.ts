import { BadRequestException } from '@nestjs/common';
import { csvCell, maskExportName, reportPeriod, sumMoney } from '../utils/report.util';

describe('report utilities', () => {
  it('creates an inclusive UTC period', () => {
    expect(
      reportPeriod({ dateFrom: '2026-08-01', dateTo: '2026-08-11' }),
    ).toEqual({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-11',
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-11T23:59:59.999Z'),
    });
  });

  it('rejects reversed and oversized periods', () => {
    expect(() =>
      reportPeriod({ dateFrom: '2026-08-11', dateTo: '2026-08-01' }),
    ).toThrow(BadRequestException);
    expect(() =>
      reportPeriod({ dateFrom: '2024-01-01', dateTo: '2026-08-11' }),
    ).toThrow(BadRequestException);
  });

  it('sums integer money without floating point conversion', () => {
    expect(sumMoney([1250, 2999, 0])).toBe(4249);
  });

  it('masks unicode names and prevents CSV formula execution', () => {
    expect(maskExportName(' শাওন ')).toBe('শ***');
    expect(csvCell('=HYPERLINK("https://example.com")')).toBe(
      '"\'=HYPERLINK(""https://example.com"")"',
    );
    expect(csvCell('Road\nBike')).toBe('"Road Bike"');
  });
});
