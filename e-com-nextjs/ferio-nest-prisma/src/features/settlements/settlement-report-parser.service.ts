import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PreflightSettlementReportDto } from './dto/settlement.dto';

const REQUIRED_HEADERS = [
  'provider_row_reference',
  'tracking_number',
  'collected_amount',
  'courier_fee',
  'other_deduction',
] as const;
const OPTIONAL_HEADERS = ['note'] as const;
const MAX_BYTES = 1_000_000;
const MAX_ROWS = 500;
const MAX_MONEY_MINOR = 2_000_000_000;
export const SETTLEMENT_CSV_PARSER_VERSION = 'canonical-v1';

@Injectable()
export class SettlementReportParserService {
  template() {
    const headers = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
    return {
      fileName: `ferio-settlement-${SETTLEMENT_CSV_PARSER_VERSION}.csv`,
      parserVersion: SETTLEMENT_CSV_PARSER_VERSION,
      amountUnit: 'BDT_DECIMAL',
      maxBytes: MAX_BYTES,
      maxRows: MAX_ROWS,
      requiredHeaders: [...REQUIRED_HEADERS],
      optionalHeaders: [...OPTIONAL_HEADERS],
      content: `${headers.join(',')}\n`,
    };
  }

  preflight(dto: PreflightSettlementReportDto) {
    if (!dto.fileName.normalize('NFKC').trim().toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Settlement report must be a CSV file');
    }
    const byteLength = Buffer.byteLength(dto.content, 'utf8');
    if (byteLength > MAX_BYTES) {
      throw new BadRequestException('Settlement report exceeds the 1 MB limit');
    }
    if (dto.content.includes('\0')) {
      throw new BadRequestException('Settlement report contains invalid bytes');
    }
    const sourceChecksum = createHash('sha256')
      .update(dto.content)
      .digest('hex');
    const parsed = this.parseCsv(dto.content.replace(/^\uFEFF/, ''));
    if (parsed.length === 0) {
      throw new BadRequestException('Settlement report is empty');
    }
    const errors: string[] = [];
    const warnings: string[] = [];
    const headers = parsed[0].map((header) => this.normalizeHeader(header));
    const duplicateHeaders = headers.filter(
      (header, index) => header && headers.indexOf(header) !== index,
    );
    if (duplicateHeaders.length > 0) {
      errors.push(
        `Duplicate headers: ${[...new Set(duplicateHeaders)].join(', ')}`,
      );
    }
    for (const required of REQUIRED_HEADERS) {
      if (!headers.includes(required)) {
        errors.push(`Missing required header: ${required}`);
      }
    }
    const supportedHeaders = new Set<string>([
      ...REQUIRED_HEADERS,
      ...OPTIONAL_HEADERS,
    ]);
    const unknownHeaders = headers.filter(
      (header) => header && !supportedHeaders.has(header),
    );
    if (unknownHeaders.length > 0) {
      warnings.push(
        `Ignored unsupported headers: ${[...new Set(unknownHeaders)].join(', ')}`,
      );
    }
    const dataRows = parsed.slice(1);
    if (dataRows.length > MAX_ROWS) {
      errors.push(`Report has ${dataRows.length} rows; maximum is ${MAX_ROWS}`);
    }
    const normalizedRows: Array<{
      providerRowReference: string;
      trackingNumber: string;
      collectedAmount: number;
      courierFee: number;
      otherDeduction: number;
      note?: string;
    }> = [];
    const rowReferences = new Set<string>();
    const trackingNumbers = new Set<string>();
    let rejectedLineCount = 0;
    for (const [index, fields] of dataRows.slice(0, MAX_ROWS).entries()) {
      const lineNumber = index + 2;
      if (fields.every((field) => field.trim() === '')) {
        warnings.push(`Line ${lineNumber} is blank and was ignored`);
        continue;
      }
      const rowErrors: string[] = [];
      if (fields.length !== headers.length) {
        rowErrors.push(
          `expected ${headers.length} columns but found ${fields.length}`,
        );
      }
      const value = (header: string) => {
        const position = headers.indexOf(header);
        return position < 0
          ? ''
          : (fields[position] ?? '').normalize('NFKC').trim();
      };
      const providerRowReference = value('provider_row_reference');
      const trackingNumber = value('tracking_number');
      if (!providerRowReference)
        rowErrors.push('provider row reference is required');
      if (!trackingNumber) rowErrors.push('tracking number is required');
      const collectedAmount = this.parseMoney(
        value('collected_amount'),
        'collected amount',
        rowErrors,
      );
      const courierFee = this.parseMoney(
        value('courier_fee'),
        'courier fee',
        rowErrors,
      );
      const otherDeduction = this.parseMoney(
        value('other_deduction'),
        'other deduction',
        rowErrors,
      );
      if (providerRowReference && rowReferences.has(providerRowReference)) {
        rowErrors.push('provider row reference is duplicated');
      }
      if (trackingNumber && trackingNumbers.has(trackingNumber)) {
        rowErrors.push('tracking number is duplicated');
      }
      if (
        collectedAmount !== null &&
        courierFee !== null &&
        otherDeduction !== null &&
        courierFee + otherDeduction > collectedAmount
      ) {
        rowErrors.push('fees and deductions exceed collected amount');
      }
      if (rowErrors.length > 0) {
        rejectedLineCount += 1;
        errors.push(`Line ${lineNumber}: ${rowErrors.join('; ')}`);
        continue;
      }
      rowReferences.add(providerRowReference);
      trackingNumbers.add(trackingNumber);
      const note = value('note');
      normalizedRows.push({
        providerRowReference,
        trackingNumber,
        collectedAmount: collectedAmount!,
        courierFee: courierFee!,
        otherDeduction: otherDeduction!,
        ...(note ? { note } : {}),
      });
    }
    if (normalizedRows.length === 0 && errors.length === 0) {
      errors.push('Settlement report has no data rows');
    }
    const normalizedRowsChecksum = createHash('sha256')
      .update(JSON.stringify(normalizedRows))
      .digest('hex');
    return {
      provider: dto.provider,
      fileName: dto.fileName.normalize('NFKC').trim(),
      sourceChecksum,
      normalizedRowsChecksum,
      parserVersion: SETTLEMENT_CSV_PARSER_VERSION,
      byteLength,
      headers,
      rowCount: dataRows.length,
      acceptedRowCount: normalizedRows.length,
      rejectedLineCount,
      ready: errors.length === 0,
      errors,
      warnings,
      rows: normalizedRows,
    };
  }

  private parseCsv(content: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let index = 0; index < content.length; index += 1) {
      const character = content[index];
      if (inQuotes) {
        if (character === '"') {
          if (content[index + 1] === '"') {
            field += '"';
            index += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += character;
        }
        continue;
      }
      if (character === '"') {
        if (field.length !== 0) {
          throw new BadRequestException('CSV contains an unexpected quote');
        }
        inQuotes = true;
      } else if (character === ',') {
        row.push(field);
        field = '';
      } else if (character === '\n' || character === '\r') {
        if (character === '\r' && content[index + 1] === '\n') index += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += character;
      }
    }
    if (inQuotes) {
      throw new BadRequestException(
        'CSV contains an unterminated quoted field',
      );
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  private normalizeHeader(value: string) {
    return value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  private parseMoney(value: string, label: string, errors: string[]) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
      errors.push(
        `${label} must be a non-negative BDT amount with up to 2 decimals`,
      );
      return null;
    }
    const [whole, fraction = ''] = value.split('.');
    const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(minor) || minor > MAX_MONEY_MINOR) {
      errors.push(`${label} exceeds the supported amount`);
      return null;
    }
    return minor;
  }
}
