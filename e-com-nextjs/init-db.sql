-- Creates the control-plane database alongside the default ferio_dev.
-- Runs automatically on first container start via docker-entrypoint-initdb.d.

CREATE DATABASE ferio_platform;
GRANT ALL PRIVILEGES ON DATABASE ferio_platform TO ferio;
