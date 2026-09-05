import { BadRequestException } from '@nestjs/common';
import { SettlementReportParserService } from '../services/settlement-report-parser.service';

const headers =
  'provider_row_reference,tracking_number,collected_amount,courier_fee,other_deduction,note';

describe('SettlementReportParserService', () => {
  const parser = new SettlementReportParserService();

  it('keeps the downloadable template aligned with parser headers', () => {
    const template = parser.template();
    const preflight = parser.preflight({
      provider: 'STEADFAST',
      fileName: template.fileName,
      content: template.content,
    });

    expect(template).toEqual(
      expect.objectContaining({
        parserVersion: 'canonical-v1',
        amountUnit: 'BDT_DECIMAL',
        maxBytes: 1_000_000,
        maxRows: 500,
      }),
    );
    expect(preflight.headers).toEqual([
      ...template.requiredHeaders,
      ...template.optionalHeaders,
    ]);
    expect(preflight.errors).toEqual(['Settlement report has no data rows']);
  });

  it('normalizes canonical CSV rows and quoted notes without posting data', () => {
    const result = parser.preflight({
      provider: 'STEADFAST',
      fileName: 'steadfast-settlement.csv',
      content: `\uFEFF${headers},unused_column\r\nrow-1,TRK-1,1500.50,50,0,"Delivered, verified",ignored`,
    });

    expect(result).toEqual(
      expect.objectContaining({
        provider: 'STEADFAST',
        ready: true,
        rowCount: 1,
        acceptedRowCount: 1,
        rejectedLineCount: 0,
        sourceChecksum: expect.stringMatching(/^[a-f0-9]{64}$/),
        warnings: ['Ignored unsupported headers: unused_column'],
      }),
    );
    expect(result.rows).toEqual([
      {
        providerRowReference: 'row-1',
        trackingNumber: 'TRK-1',
        collectedAmount: 150050,
        courierFee: 5000,
        otherDeduction: 0,
        note: 'Delivered, verified',
      },
    ]);
  });

  it('returns header and money diagnostics without normalized invalid rows', () => {
    const result = parser.preflight({
      provider: 'PATHAO',
      fileName: 'pathao.csv',
      content:
        'provider_row_reference,tracking_number,collected_amount,courier_fee\nrow-1,TRK-1,10.999,2',
    });

    expect(result.ready).toBe(false);
    expect(result.acceptedRowCount).toBe(0);
    expect(result.rejectedLineCount).toBe(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Missing required header: other_deduction',
        expect.stringContaining('collected amount must be'),
      ]),
    );
  });

  it('rejects duplicate row identities and deductions above collection', () => {
    const result = parser.preflight({
      provider: 'STEADFAST',
      fileName: 'duplicate.csv',
      content: `${headers}\nrow-1,TRK-1,100,5,0,first\nrow-1,TRK-2,20,15,10,second`,
    });

    expect(result.ready).toBe(false);
    expect(result.acceptedRowCount).toBe(1);
    expect(result.errors).toEqual([
      expect.stringContaining('provider row reference is duplicated'),
    ]);
    expect(result.errors[0]).toContain(
      'fees and deductions exceed collected amount',
    );
  });

  it('rejects malformed quoted CSV and non-CSV files', () => {
    expect(() =>
      parser.preflight({
        provider: 'STEADFAST',
        fileName: 'report.csv',
        content: `${headers}\nrow-1,TRK-1,100,5,0,"unterminated`,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parser.preflight({
        provider: 'STEADFAST',
        fileName: 'report.txt',
        content: headers,
      }),
    ).toThrow('Settlement report must be a CSV file');
  });

  it('reports files above the 500 row operational limit', () => {
    const rows = Array.from(
      { length: 501 },
      (_, index) => `row-${index},TRK-${index},100,5,0,`,
    );
    const result = parser.preflight({
      provider: 'PATHAO',
      fileName: 'large.csv',
      content: [headers, ...rows].join('\n'),
    });

    expect(result.ready).toBe(false);
    expect(result.rowCount).toBe(501);
    expect(result.acceptedRowCount).toBe(500);
    expect(result.errors).toContain('Report has 501 rows; maximum is 500');
  });
});
