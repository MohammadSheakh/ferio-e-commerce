function boundedInteger(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

const backendReplicas = boundedInteger(
  'CONNECTION_BUDGET_BACKEND_REPLICAS',
  1,
  1,
  1_000,
);
const postgresMaxConnections = boundedInteger(
  'CONNECTION_BUDGET_POSTGRES_MAX_CONNECTIONS',
  100,
  20,
  100_000,
);
const reservedConnections = boundedInteger(
  'CONNECTION_BUDGET_RESERVED_CONNECTIONS',
  10,
  0,
  postgresMaxConnections - 1,
);
const legacyPoolMax = boundedInteger('DB_POOL_MAX', 10, 1, 100);
const platformPoolMax = boundedInteger(
  'CONNECTION_BUDGET_PLATFORM_POOL_MAX',
  5,
  1,
  100,
);
const tenantClients = boundedInteger('TENANT_DB_MAX_CLIENTS', 25, 2, 500);
const tenantPoolMax = boundedInteger('TENANT_DB_POOL_MAX', 3, 1, 50);

const connectionsPerBackend =
  legacyPoolMax + platformPoolMax + tenantClients * tenantPoolMax;
const theoreticalConnections = connectionsPerBackend * backendReplicas;
const usableConnections = postgresMaxConnections - reservedConnections;

const evidence = {
  event: 'postgres_connection_budget',
  backendReplicas,
  postgresMaxConnections,
  reservedConnections,
  usableConnections,
  connectionsPerBackend,
  theoreticalConnections,
  withinBudget: theoreticalConnections <= usableConnections,
};
console.log(JSON.stringify(evidence));

if (!evidence.withinBudget) {
  throw new Error(
    `PostgreSQL connection budget exceeded: ${theoreticalConnections} theoretical > ${usableConnections} usable`,
  );
}
