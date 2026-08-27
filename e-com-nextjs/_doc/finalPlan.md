Yes. If you're serious about building a modern e-commerce platform (not just a shopping website), you should think of it as one platform with multiple applications, not one website.

This is how I would design it.

Your E-Commerce Platform
                    Your Platform

         ┌──────────────────────────┐
         │       Backend APIs        │
         │   Business Logic Layer    │
         └────────────┬──────────────┘
                      │
      ┌───────────────┼──────────────────┐
      │               │                  │
      ▼               ▼                  ▼

Customer Web     Admin Dashboard    Mobile Apps


The backend is shared.

The frontend changes depending on who is using it.

1. Customer Website

Example:

www.yourbrand.com

Customer can

Browse products
Search
Wishlist
Add to cart
Checkout
Pay
Track orders
Review products
Login
View profile

This is what everyone sees.

2. Admin Dashboard

Example

admin.yourbrand.com

Only employees can access it.

Inside this dashboard you'll have many modules.

Dashboard

Products

Categories

Orders

Inventory

Customers

Marketing

CRM

Facebook Leads

WhatsApp

Email

SMS

Coupons

Reports

Finance

Returns

Seller Management

Settings
-------------------------------

This is actually an ERP (Enterprise Resource Planning) for your company.

3. Marketing Dashboard

Many companies make this separate.

I would make it a module inside Admin.

Admin

├── Products
├── Orders
├── Customers
├── Marketing
│      ├── Facebook
│      ├── Instagram
│      ├── WhatsApp
│      ├── Email
│      ├── SMS
│      ├── Campaigns
│      ├── Automation
│      ├── Customer Segments
│      ├── CRM
│      └── Analytics

Marketing team never needs another software.

Everything is inside your platform.

4. CRM

This is the most valuable thing.

Imagine someone buys once.

Instead of

Facebook

↓

Customer buys

↓

Finished
---------------------------

You'll have

Facebook

↓

Website

↓

Customer Database

↓

CRM

↓

Marketing Automation

↓

Repeat Purchase

That's the real business.
-------------------------------------

5. Customer 360

When marketing opens a customer

Instead of

Name

Phone
---------------------------------
They should see

Name

Phone

WhatsApp

Facebook Lead

Last Order

Lifetime Spend

Favorite Category

Average Order

Last Seen

Products Viewed

Coupons Used

Campaign Source

COD Success Rate

Return Rate

Customer Value

AI Recommendation

Everything.
-----------------------------------------------
6. Marketing Automation

Imagine

A customer bought

Cotton Three Piece

30 days later

Automation
-------------------------

Customer bought Cotton

↓

Wait 30 days

↓

Check

↓

New Cotton Collection Available?

↓

YES

↓

Send WhatsApp

↓

Send Email

↓

Add Facebook Custom Audience

↓

Track Purchase
-------------------------------

Nobody manually sends messages.

7. Facebook Integration

Inside Admin

Marketing

↓

Facebook

↓

Campaigns

↓

Lead Ads

↓

Pixel

↓

Conversions API

↓

Custom Audience

↓

Lookalike Audience

↓

Analytics

Marketing team never opens Meta Business Suite unless necessary.
----------------------------------
8. WhatsApp

Inside Admin

Marketing

↓

WhatsApp

↓

Templates

↓

Broadcast

↓

Conversations

↓

Automation

↓

Reports
--------------------

Example

New Collection

↓

Choose Audience

↓

Women

↓

Dhaka

↓

Purchased Last 180 Days

↓

Send Template

↓

Done
-------------------------------------
9. Lead Management

Facebook Lead

↓

Admin receives lead

↓

Assign Sales Executive

↓

Call

↓

WhatsApp

↓

Draft Order

↓

Checkout Link

↓

Converted

↓

Customer

↓

CRM

Everything stays in your own database.
------------------------------------------------

10. AI

Later

Admin

↓

AI Assistant


Ask

Show customers likely to buy premium three-piece.


AI returns

523 Customers

Average Spend
৳4,200

Last Purchase

72 Days

Expected Conversion

18%

Recommended Channel

WhatsApp

-----------------------------------
Or

Generate Bangla WhatsApp campaign

for VIP customers

AI creates it.
-----------------------------------
11. Analytics

Your CEO dashboard

Today's Revenue

Today's Profit

Delivered Orders

Pending Orders

Marketing Cost

Customer Acquisition Cost

Customer Lifetime Value

Repeat Purchase

WhatsApp Conversion

Facebook ROAS

Top Categories

Top Products

District Wise Sales

Courier Performance

COD Success Rate

Everything.

If I were building it today

I would actually build 6 applications, all sharing the same backend.

1.
Customer Website

↓

2.
Admin Dashboard

↓

3.
Warehouse Dashboard

↓

4.
Sales & CRM Dashboard

↓

5.
Delivery/Courier Dashboard

↓

6.
Customer Mobile App (react native)

All connected to one backend.

My recommendation for your project

Since you mentioned you want to build something at a senior/staff engineer level, I would not think of it as "an e-commerce website."

Think of it as a Commerce Operating System (Commerce OS).

The shopping website is only 10–15% of the entire platform.

The remaining 85–90% is the operational software that powers the business:

Commerce (catalog, cart, checkout, orders)
Operations (inventory, warehouse, logistics)
CRM (customer profiles, leads, support)
Marketing (Facebook, WhatsApp, SMS, email, automation)
Finance (payments, refunds, settlements)
Analytics (business intelligence, dashboards)
AI (recommendations, segmentation, campaign generation)

That kind of architecture can scale from a single-brand store to a full marketplace without needing to redesign the foundation.