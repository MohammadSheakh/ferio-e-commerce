-- Keep reserved platform subdomains unreachable until tenant readiness passes.
ALTER TYPE "TenantDomainStatus" ADD VALUE IF NOT EXISTS 'PENDING_ACTIVATION';
