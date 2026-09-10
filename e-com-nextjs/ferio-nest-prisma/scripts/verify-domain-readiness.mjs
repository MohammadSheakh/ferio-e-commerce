#!/usr/bin/env node
import dns from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import tls from 'node:tls';

const HOSTNAME = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function usage() {
  console.error(
    'usage: node scripts/verify-domain-readiness.mjs <hostname> <verification-token> [expected-address]',
  );
}

function normalizeHostname(value) {
  const hostname = value.trim().toLowerCase().replace(/\.$/, '');
  if (!HOSTNAME.test(hostname)) {
    throw new Error('hostname must be a public DNS name');
  }
  return hostname;
}

function flattenTxt(records) {
  return records.map((record) => record.join('')).filter(Boolean);
}

function connectTls(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: true,
      timeout: 10_000,
    });

    const finish = (error) => {
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.once('secureConnect', () => {
      if (!socket.authorized) {
        finish(new Error(socket.authorizationError || 'TLS_CERTIFICATE_INVALID'));
        return;
      }
      finish();
    });
    socket.once('timeout', () => finish(new Error('TLS_CONNECTION_TIMEOUT')));
    socket.once('error', finish);
  });
}

export async function verifyDomainReadiness(hostnameInput, token, expectedAddress) {
  const hostname = normalizeHostname(hostnameInput);
  const verificationName = `_ferio-verification.${hostname}`;
  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.length === 0) throw new Error('DNS_HOST_NOT_RESOLVED');
  if (
    expectedAddress &&
    !addresses.some(({ address }) => address === expectedAddress)
  ) {
    throw new Error(`DNS_ADDRESS_MISMATCH:${expectedAddress}`);
  }

  const txt = flattenTxt(await dns.resolveTxt(verificationName));
  if (!txt.includes(token)) throw new Error('DNS_VERIFICATION_TOKEN_MISSING');
  await connectTls(hostname);

  return {
    hostname,
    verificationName,
    addresses: addresses.map(({ address, family }) => ({ address, family })),
    tls: 'verified',
  };
}

async function main() {
  const [, , hostname, token, expectedAddress] = process.argv;
  if (!hostname || !token) {
    usage();
    process.exitCode = 64;
    return;
  }

  try {
    const result = await verifyDomainReadiness(hostname, token, expectedAddress);
    console.log(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DOMAIN_READINESS_FAILED';
    console.error(`domain readiness failed: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
