# Tenant Admin — Customers (role: admin)

**Frontend:** `app/customers/*`
**Verified against:** `customers.controller.ts` (`@Controller('admin/customers')`), CustomerAccountService

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/customers?page&limit&search&sort&filter&month` | Paginated search/filter across THIS tenant only (cross-DB impossible) |
| 2 | GET | `/admin/customers/:id` | Profile: delivered/cancelled/returned counters, spend, addresses, orders |

Customer identity is tenant-local (PO-015): the same human at another store
is a different record by design. Search cannot cross databases.
