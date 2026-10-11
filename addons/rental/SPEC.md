# Equipment Rental & Service System
Odoo 20 Community. Modules: rental_core, rental_sale, rental_website.
Web app: ./web (Next.js).
## Goal
A small company rents tools to customers. Staff manage equipment, orders,
returns, and repairs. Customers book online and see their own rentals.
## Roles
- Manager: everything.
- Staff: manage equipment, orders, maintenance. Cannot delete.
- Customer (portal): sees own orders and contracts only.
- Visitor (public): sees equipment and sends a booking request.
## Models (rental_core)
rental.category: name
rental.equipment: name*, code (unique), category_id, image, daily_price (money),
state [available, rented, maintenance], notes,
rental_count (computed)
rental.order: name (sequence RNT/0001), customer_id* (res.partner),
user_id (staff, default current user), date_start*, date_end*,
days (computed), line_ids, total (computed, stored),
state [draft, confirmed, rented, overdue, returned, cancelled]
rental.order.line: order_id*, equipment_id*, daily_price (default from equipment),
subtotal (computed)
rental.maintenance: equipment_id*, date, description, cost,
state [todo, done], technician_id (res.users)
## Rules
- date_end must be on or after date_start.
- Same equipment cannot be in two active orders (confirmed, rented, overdue)
with overlapping dates.
- Workflow: Draft > Confirmed > Rented > Returned.
Cancel allowed in Draft or Confirmed. Overdue is set by a daily cron.
- Start Rental sets equipment to rented.
- Return (wizard: damaged? notes) sets equipment to available,
or to maintenance and creates a maintenance record if damaged.
## Screens
Menu "Rentals": Orders, Equipment, Maintenance, Reporting, Configuration.
Orders: list, form (statusbar, buttons, lines, chatter), kanban by state, calendar.
Equipment: kanban with image, list, form with smart buttons.
Reporting: graph (revenue by month), pivot (by category), counts by state.
## Documents
Odoo Masterclass | The AI-Powered Developer's Guide Page 43
PDF "Rental Contract". Emails: "Rental Confirmed" (with contract),
"Return due tomorrow".
## Automation
Daily: send reminders. Daily: mark overdue.
## Integration (rental_sale)
Button "Create Invoice" on a returned order > sale.order > invoice.
Optional: Inventory delivery and return of serial-tracked units.
## Website (rental_website)
/rental (list), /rental/book (form), /my/rentals (portal).
## API + Next.js
Odoo methods: api_list_equipment, api_check_availability, api_create_booking.
Next.js (./web): list, detail with availability check, booking form.
## Not in scope
Online payment, multi-company, mobile app, deposits.
