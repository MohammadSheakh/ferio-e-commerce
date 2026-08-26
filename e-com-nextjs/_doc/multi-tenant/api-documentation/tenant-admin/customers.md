# Tenant Admin — Customers (role: admin)

**Frontend:** `app/customers/*`
**Verified against:** `customers.controller.ts` (`@Controller('admin/customers')`), CustomerAccountService

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/customers?page&search&hasWallet&source` | Paginated search across THIS tenant only (cross-DB impossible) |
| 2 | GET | `/admin/customers/:id` | Profile: delivered/cancelled/returned counters, spend, addresses, orders |
| 3 | GET | `/admin/customers/:id/orders` | That customer's order list |

Customer identity is tenant-local (PO-015): the same human at another store
is a different record by design. Search cannot cross databases.
