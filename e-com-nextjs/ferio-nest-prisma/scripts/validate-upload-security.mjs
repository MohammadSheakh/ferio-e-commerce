#!/usr/bin/env node

/**
 * Validate the production direct-upload malware scanning contract.
 *
 * This checks configuration only. It does not call the scanner or claim that
 * the provider has quarantine/retention enabled; deployment evidence remains
 * an operational gate.
 */

const environment =
  process.env.UPLOAD_SECURITY_POLICY_ENV?.trim() || process.env.NODE_ENV;
if (environment !== 'production') {
  console.log('upload_security_check=skipped_non_production');
  process.exit(0);
}

const endpoint = process.env.MALWARE_SCANNER_URL?.trim();
if (!endpoint) {
  throw new Error('MALWARE_SCANNER_URL must be set for production');
}
if (!/^https:\/\//i.test(endpoint)) {
  throw new Error('MALWARE_SCANNER_URL must use HTTPS in production');
}
if (/example\.com|localhost|127\.0\.0\.1|placeholder|changeme/i.test(endpoint)) {
  throw new Error('MALWARE_SCANNER_URL must identify the approved scanner');
}

const timeoutMs = Number(process.env.MALWARE_SCANNER_TIMEOUT_MS || 10_000);
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) {
  throw new Error('MALWARE_SCANNER_TIMEOUT_MS must be between 1000 and 60000');
}

console.log(
  JSON.stringify({
    upload_security_check: 'passed',
    scannerConfigured: true,
    scannerProtocol: 'https',
    timeoutMs,
  }),
);
