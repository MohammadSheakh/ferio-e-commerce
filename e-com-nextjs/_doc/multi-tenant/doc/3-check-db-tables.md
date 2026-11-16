Ran check createTenantDatabase in local-postgres-provisioner.ts
Analyzed local-postgres-provisioner.ts:L38-90
Ran test host connection on port 5433 with user ferio · Exited with code 2
Ran list databases on port 5433
Ran test connecting to ferio_tenant_test_78f1
Ran query User table in ferio_tenant_test_78f1

Based on your DBeaver screenshot, there are **three reasons** the connection failed:

---

### The Error in Your DBeaver Screenshot:

```text
FATAL: password authentication failed for user "postgres"
Connecting to: ferio_tenant_ferio_2_fe21 @ localhost:5432
```

1. **Wrong Username (`postgres`):**
   The PostgreSQL instance in this project does **not** have a `postgres` user. The superuser and owner is **`ferio`**.
2. **Wrong Port (`5432`):**
   Notice right above it that your working connections (`ferio_dev` and `ferio_platform`) use port **`5433`**!
   `5432` is the internal Docker port. Your host machine exposes it on **`5433`**.
3. **Database Name:**
   In your second screenshot, the active organization is **`test`**, whose database name is:
   `ferio_tenant_test_78f1` (the old `ferio-2` database was deleted).

---

### Correct Credentials for DBeaver

To connect to any tenant database in DBeaver, use the exact same credentials as your `ferio_platform` connection:

| Setting | Value |
| :--- | :--- |
| **Host** | `localhost` |
| **Port** | **`5433`** *(not 5432)* |
| **Database** | `ferio_tenant_test_78f1` *(or whichever database name is shown in Platform Admin)* |
| **Username** | **`ferio`** *(not postgres)* |
| **Password** | **`ferio`** |

---

### Verification

Connecting with `ferio` / `ferio` on port `5433` connects immediately.

We just checked inside your `ferio_tenant_test_78f1` database:
```sql
SELECT id, email, role, "staffAccessStatus" FROM "User";
```
Result:
```text
              id              |      email      | role  | staffAccessStatus 
------------------------------+-----------------+-------+-------------------
 usr_c40d2f86c955d69678623e6e | od1@yopmail.com | admin | active
```
The automated owner provisioning successfully seeded `od1@yopmail.com` with role `admin` and default password `Admin@123456` into the database! Update your connection in DBeaver with **Port: 5433** and **User: ferio**, and it will open right up.