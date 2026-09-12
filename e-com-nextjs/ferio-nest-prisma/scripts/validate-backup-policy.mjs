#!/usr/bin/env node

/**
 * Validate the provider-side backup contract before a production deploy.
 *
 * This is intentionally configuration-only: it does not connect to a
 * provider, inspect secrets, or claim that PITR is enabled. The provider
 * deployment must supply the values after configuring its own controls.
 */

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
};

const integer = (name) => {
  const value = Number(required(name));
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
};

const environment = process.env.BACKUP_POLICY_ENV?.trim() || process.env.NODE_ENV;
if (environment !== 'production') {
  console.log('backup_policy_check=skipped_non_production');
  process.exit(0);
}

const provider = required('BACKUP_PROVIDER').toLowerCase();
if (/^(todo|unknown|local|docker|placeholder|changeme)$/.test(provider)) {
  throw new Error('BACKUP_PROVIDER must identify the selected managed provider');
}

if (required('BACKUP_PITR_ENABLED').toLowerCase() !== 'true') {
  throw new Error('BACKUP_PITR_ENABLED must be true for production');
}

const retentionDays = integer('BACKUP_RETENTION_DAYS');
const rpoMinutes = integer('BACKUP_RPO_MINUTES');
const rtoMinutes = integer('BACKUP_RTO_MINUTES');
const schedule = required('BACKUP_LOGICAL_SCHEDULE');

if (retentionDays < 30) {
  throw new Error('BACKUP_RETENTION_DAYS must be at least 30');
}
if (rpoMinutes > 60) {
  throw new Error('BACKUP_RPO_MINUTES must be at most 60');
}
if (rtoMinutes > 240) {
  throw new Error('BACKUP_RTO_MINUTES must be at most 240');
}
if (schedule.length > 120 || /[\r\n]/.test(schedule)) {
  throw new Error('BACKUP_LOGICAL_SCHEDULE must be a bounded single-line value');
}

console.log(
  JSON.stringify({
    backup_policy_check: 'passed',
    provider,
    pitr: true,
    retentionDays,
    rpoMinutes,
    rtoMinutes,
    logicalScheduleConfigured: true,
  }),
);
