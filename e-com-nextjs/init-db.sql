-- Creates the control-plane database alongside the default ferio_dev.
-- Runs automatically on first container start via docker-entrypoint-initdb.d.

CREATE DATABASE ferio_platform;
GRANT ALL PRIVILEGES ON DATABASE ferio_platform TO ferio;

-- Disposable integration-test server. The test runner creates and drops its
-- own tenant databases from this database connection.
CREATE DATABASE ferio_test_runner;
GRANT ALL PRIVILEGES ON DATABASE ferio_test_runner TO ferio;
