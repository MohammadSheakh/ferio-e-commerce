#!/usr/bin/env node

/**
 * Validate the production tenant host trust contract before deployment.
 *
 * This is intentionally configuration-only. It does not discover ingress
 * peers or claim that DNS/TLS is configured; those facts require deployment
 * evidence. It rejects ambiguous and internet-wide forwarded-host trust.
 */
import { isIP } from 'node:net';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
};

const environment =
  process.env.TENANT_EDGE_POLICY_ENV?.trim() || process.env.NODE_ENV;
if (environment !== 'production') {
  console.log('tenant_edge_policy_check=skipped_non_production');
  process.exit(0);
}

if (required('TENANCY_ENABLED').toLowerCase() !== 'true') {
  throw new Error('TENANCY_ENABLED must be true for production');
}

const publicDomain = required('PLATFORM_PUBLIC_DOMAIN').toLowerCase();
if (
  publicDomain.includes('/') ||
  publicDomain.includes(':') ||
  /\s/.test(publicDomain) ||
  publicDomain === 'localhost' ||
  isIP(publicDomain) ||
  !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(publicDomain)
) {
  throw new Error('PLATFORM_PUBLIC_DOMAIN must be a hostname, not localhost or an IP');
}

const forwardedHostPolicy = required('CUSTOMER_WEB_TRUSTED_PROXY').toLowerCase();
if (!['true', 'false'].includes(forwardedHostPolicy)) {
  throw new Error('CUSTOMER_WEB_TRUSTED_PROXY must be exactly true or false');
}

const cidrs = required('TENANT_TRUSTED_PROXY_CIDRS')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (cidrs.length === 0) {
  throw new Error('TENANT_TRUSTED_PROXY_CIDRS must contain at least one CIDR');
}

for (const cidr of cidrs) {
  const separator = cidr.lastIndexOf('/');
  if (separator <= 0 || separator === cidr.length - 1) {
    throw new Error(`TENANT_TRUSTED_PROXY_CIDRS contains an invalid CIDR: ${cidr}`);
  }
  const address = cidr.slice(0, separator);
  const prefix = Number(cidr.slice(separator + 1));
  const version = isIP(address);
  const maxPrefix = version === 4 ? 32 : version === 6 ? 128 : -1;
  if (!Number.isInteger(prefix) || prefix < 1 || prefix > maxPrefix) {
    throw new Error(`TENANT_TRUSTED_PROXY_CIDRS contains an unsafe CIDR: ${cidr}`);
  }
}

console.log(
  JSON.stringify({
    tenant_edge_policy_check: 'passed',
    publicDomain,
    forwardedHostPolicy,
    trustedProxyCidrCount: cidrs.length,
  }),
);
