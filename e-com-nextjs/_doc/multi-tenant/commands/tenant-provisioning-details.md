I’ll apply the staging configuration locally, resolve the backend’s current customer-web peer CIDR required by the fail-closed overlay, restart only backend and customer-web, then run the public host probes. I will not change Cloudflare routes from the repository side; the Dashboard route still needs ferio.sheakh.qzz.io -> localhost:3000 and *.sheakh.qzz.io -> localhost:3000 as discussed.




Read files, ran commands


The overlay file was missing, and the running containers reveal the customer-web peer as 172.18.0.7; the backend is 172.18.0.5. I’m creating the untracked staging env with the requested domain/proxy values plus the required narrow /32 peer policy, then I’ll restart the two services.




Edited a file, ran a command


The restart command hit a Docker output-stream error (write /dev/stdout: bad file descriptor) before producing a trustworthy completion result. I’m checking whether the services actually changed; if not, I’ll rerun the restart with output captured to a file so the Docker/PTy issue cannot hide the result.




  Ran commands


The second restart is running with output captured safely; Docker is still building/recreating the requested services, so I’m waiting for the actual exit status rather than assuming success. Once it finishes, I’ll verify the exact environment values and only then run the public probes.




  Ran commands


The rebuild has progressed to container recreation, but Docker currently reports both target containers as created rather than running, and the captured build log is empty. I’m treating this as an infrastructure/tooling hang and will wait one more bounded interval; if it does not recover, I’ll stop the stuck compose process safely and report the exact state instead of leaving the stack ambiguous.




Ran printf '%s\n' '-- restart log --'; sed -n '1,220p' /tmp/ferio-tunnel-restart.log
printf '%s\n' '-- containers --'; docker ps -a --filter name=ferio-backend --filter name=ferio-customer-web --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
printf '%s\n' '-- last container state --'; docker inspect -f '{{.Name}} status={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}' ferio-backend ferio-customer-web 2>&1




The compose rebuild exited non-zero without a diagnostic and left the newly configured containers in Created state, so the old running instances are no longer active. The environment was applied correctly; I’m recovering by starting those already-created containers directly, then I’ll verify health and logs before any public test.




  Ran commands


The staging values are applied, but the recovered backend is not healthy because its Redis clients are timing out; the customer-web container is up. This is a real dependency issue, not a tenant/proxy issue, so I’m checking the backend’s Redis host/port against the running ferio-redis service and will correct only the local runtime wiring if it is stale.




Read files, ran commands


The root cause is now precise: ferio-redis is running with the Compose network mode but has no network endpoint or published port, so backend hostname redis:6379 cannot resolve/reach it. I’m force-recreating only Redis with the rendered Compose definition, then I’ll restart the backend and verify the full chain.




  Ran commands


Redis recreation exposed the known host-port conflict: this machine already owns 127.0.0.1:6379. I’m preserving that host Redis and starting the project Redis on host port 6380 via a temporary Compose override; backend-to-Redis traffic remains internal on redis:6379, so this does not weaken application isolation.




Edited files, ran commands


The first local override inherited the base 6379:6379 mapping and added 6380, so Docker still tried to bind 6379. I’m correcting the override to replace the port list, not merge it, then recreating Redis once more; the existing host Redis remains untouched.




Edited a file, ran a command


The local runtime is recovered and healthy: project Redis is on host 6380 with internal redis:6379, backend is healthy, customer-web is running, and the requested staging env is applied. I’m now running the final local/public probes; the public result will reflect whether the Cloudflare Dashboard route changes have been applied yet.




  Ran commands


The Cloudflare route changes are now effective: ferio.sheakh.qzz.io, tenant-a.sheakh.qzz.io, and tenant-b.sheakh.qzz.io all return HTTPS 200 through Cloudflare, and the local stack is healthy. The remaining blocker is application provisioning: the control plane still has only ferio.local tenant domains, so the public tenant hosts correctly render the fail-closed “Store unavailable” state; I’m locating the supported platform provisioning/domain activation flow rather than editing database rows directly.




Read files, ran commands


The public routing is now working, and the current control plane confirms no sheakh.qzz.io tenant domains exist yet. I’m using the supported platform API with the locally seeded platform operator credentials to create two disposable organizations and run their normal idempotent provisioning flow; I will not insert domains or tenant databases directly into PostgreSQL.




Ran set -e
umask 077
login_body=/tmp/ferio-platform-login.json
token_file=/tmp/ferio-platform-token
email=$(awk -F= '$1=="PLATFORM_INITIAL_SUPERADMIN_EMAIL" {sub(/^[^=]*=/,""); print}' ferio-nest-prisma/.env | tail -n 1)
password=$(awk -F= '$1=="PLATFORM_INITIAL_SUPERADMIN_PASSWORD" {sub(/^[^=]*=/,""); print}' ferio-nest-prisma/.env | tail -n 1)
if [ -z "$email" ] || [ -z "$password" ]; then echo 'platform seed credentials unavailable' >&2; exit 2; fi
jq -n --arg email "$email" --arg password "$password" '{email:$email,password:[REDACTED_SECRET]' |
  curl -fsS --max-time 20 -H 'Content-Type: application/json' -d @- \
    http://127.0.0.1:6733/api/v1/platform/auth/login > "$login_body"
jq -er '.data.accessToken // .accessToken' "$login_body" > "$token_file"
create_org() {
  local slug="$1" name="$2" email="$3" body_file="$4"
  jq -n --arg name "$name" --arg slug "$slug" --arg ownerEmail "$email" \
    '{name:$name,slug:$slug,ownerEmail:$ownerEmail}' |
    curl -fsS --max-time 20 -H "Authorization: Bearer $(cat "$token_file")" \
      -H 'Content-Type: application/json' -d @- \
      http://127.0.0.1:6733/api/v1/platform/organizations > "$body_file"
  jq -er '.data.id // .id' "$body_file"
}
provision_org() {
  local id="$1" key="$2" body_file="$3"
  jq -n --arg key "$key" '{idempotencyKey:$key}' |
    curl -fsS --max-time 180 -H "Authorization: Bearer $(cat "$token_file")" \
      -H 'Content-Type: application/json' -d @- \
      "http://127.0.0.1:6733/api/v1/platform/organizations/$id/provision" > "$body_file"
}
alpha_id=$(create_org stage-alpha-20260912 'Stage Alpha 2026-09-12' stage-alpha-20260912@example.invalid /tmp/ferio-alpha-create.json)
beta_id=$(create_org stage-beta-20260912 'Stage Beta 2026-09-12' stage-beta-20260912@example.invalid /tmp/ferio-beta-create.json)
provision_org "$alpha_id" prov-stage-alpha-20260912 /tmp/ferio-alpha-provision.json
provision_org "$beta_id" prov-stage-beta-20260912 /tmp/ferio-beta-provision.json
printf 'alpha_id=%s beta_id=%s\n' "$alpha_id" "$beta_id"
printf '%s\n' '-- provisioning summaries --'
jq '{id:(.data.id // .id),status:(.data.status // .status),organizationId:(.data.organizationId // .organizationId)}' /tmp/ferio-alpha-provision.json
jq '{id:(.data.id // .id),status:(.data.status // .status),organizationId:(.data.organizationId // .organizationId)}' /tmp/ferio-beta-provision.json
rm -f "$login_body" "$token_file" /tmp/ferio-alpha-create.json /tmp/ferio-beta-create.json /tmp/ferio-alpha-provision.json /tmp/ferio-beta-provision.json




Context automatically compacted



The tunnel-aware stack is healthy and the public hosts are reachable. I’m finishing the next evidence step now: provisioning two disposable staging tenants through the platform API, then I’ll verify their domains, SSR responses, and BFF tenant resolution without touching production data.




Read files, ran commands


The two organizations and their active domains were provisioned successfully, but the public SSR probe exposed a real staging misconfiguration: the backend is correctly rejecting forwarded hosts because the trusted-proxy CIDR was guessed, not matched to the actual customer-web container address. I’m correcting that from Docker network evidence rather than weakening the resolver.




Edited a file, ran commands


The actual proxy address is now loaded and public SSR is resolving both provisioned hosts as active: each tenant returns HTTP 200 and the unavailable page is gone. I’m recording this as positive public ingress/SSR/BFF evidence, while keeping browser cookie isolation and distinct tenant-data proof open because both disposable stores currently have the same default seeded branding.




Edited files, read files, ran a command





Completed the staging setup and validation.
- Applied .env.tunnel-staging.local:
  - PLATFORM_PUBLIC_DOMAIN=sheakh.qzz.io
  - CUSTOMER_WEB_TRUSTED_PROXY=true
  - Correct trusted proxy CIDR: 172.18.0.7/32
- Recreated backend and customer-web with the tunnel configuration.
- Preserved the existing host Redis on 6379; project Redis runs on 6380.
- Provisioned two disposable tenants:
  - stage-alpha-20260912.sheakh.qzz.io
  - stage-beta-20260912.sheakh.qzz.io
- Both public hosts return HTTP 200 for SSR and /api/store/config.
- Fixed and recorded the initial trusted-proxy failure.
Evidence: [Shot 26](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/_doc/project-progress/2026-09-12-public-staging-tenant-provisioning-shot-26.md)
Updated:
- [Cloudflare staging runbook](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/_doc/multi-tenant/commands/cloudflare-tunnel-wildcard-staging.md)
- [BHO fix tracker](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/_doc/multi-tenant/brutal-honest-opinions/10-sep-2026-BHO-backend-fix-track.md)
git diff --check passed.
Release 1 progress: approximately 97.32%. Browser cookie/cart/order/WebSocket isolation, production infrastructure, pilot onboarding, and formal approval remain open.
Next portion: run the two-browser Alpha/Beta tenant-isolation test with deliberately distinct tenant data.