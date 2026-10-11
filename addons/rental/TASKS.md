# TASKS.md — Equipment Rental & Service System

Build plan broken down into 14 sequential tasks following the specification in `SPEC.md`. Each task introduces one distinct feature and leaves all modules in an installable and working state.

---

### Task 1: Module Skeleton, Security Groups & Category Model [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Create `rental_core` structure (`__manifest__.py`, `__init__.py`, `security/`, `models/`, `views/`).
  - Security categories and groups: `Rental / Staff` (`group_rental_user`) and `Rental / Manager` (`group_rental_manager`).
  - Model `rental.category`: `name` field, `ir.model.access.csv` permissions.
  - Views: `<list>` and `<form>` views for `rental.category`.
  - Main menu structure: Root menu "Rentals" and submenu "Configuration" > "Categories".
- **How to check:**
  1. Update/install `rental_core` via Docker (`docker compose exec odoo odoo -d mydb -i rental_core --stop-after-init`).
  2. In Odoo web UI, open the top menu **Rentals** > **Configuration** > **Categories**.
  3. Click **New**, type name `"Heavy Machinery"`, and click **Save**. Verify the record appears in the list.
- **Earlier tasks needed:** None

---

### Task 2: Equipment Model & Basic Management [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Model `rental.equipment`: `name`, `code` (unique constraint), `category_id` (many2one to `rental.category`), `image` (binary), `daily_price` (monetary with currency), `state` selection (`available`, `rented`, `maintenance`, default `available`), and `notes`.
  - Add access rules in `ir.model.access.csv` for staff and manager.
  - Views: `<list>` and `<form>` views for `rental.equipment`.
  - Menu: "Rentals" > "Equipment".
- **How to check:**
  1. Open menu **Rentals** > **Equipment** > click **New**.
  2. Enter Name `"Hammer Drill"`, Code `"EQ-001"`, Category `"Heavy Machinery"`, Daily Price `35.00`. Save the record.
  3. Click **New** again, enter Code `"EQ-001"`, and click **Save**. Verify that a unique constraint validation error is raised.
- **Earlier tasks needed:** Task 1

---

### Task 3: Equipment Kanban View & Rental Count Smart Button [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - `<kanban>` view for `rental.equipment` displaying equipment image, name, code, state badge, and daily price.
  - Computed field `rental_count` on `rental.equipment`.
  - Stat/smart button on the equipment form view showing the count of rentals and linking to its orders.
- **How to check:**
  1. Navigate to **Rentals** > **Equipment**.
  2. Switch to the **Kanban** view and verify cards display images, pricing, and status badges.
  3. Click an equipment card to open the form view and verify the smart button **Rentals (0)** is visible in the top header sheet.
- **Earlier tasks needed:** Task 2

---

### Task 4: Rental Orders & Order Lines Structure [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Model `rental.order`: Sequence-based `name` (`RNT/0001` via `ir.sequence`), `customer_id` (many2one `res.partner`), `user_id` (many2one `res.users`, default current user), `date_start`, `date_end`, computed `days`, computed stored `total`, and `state` selection (`draft`, `confirmed`, `rented`, `overdue`, `returned`, `cancelled`, default `draft`).
  - Model `rental.order.line`: `order_id`, `equipment_id`, `daily_price` (auto-filled onchange/compute from equipment), and computed `subtotal` (`daily_price * days`).
  - Constraint: `date_end` must be greater than or equal to `date_start`.
  - Views: `<list>` and `<form>` views with order lines notebook table, totals section, and chatter (`<chatter/>`).
  - Menu: "Rentals" > "Orders".
- **How to check:**
  1. Go to **Rentals** > **Orders** > click **New**.
  2. Select Customer `"Deco Addict"`, Start Date today, End Date 4 days from now. Verify computed days equals 4.
  3. Add a line: select `"Hammer Drill"`. Verify daily price `35.00` auto-fills and subtotal displays `140.00`. Total updates to `140.00`.
  4. Change End Date to yesterday and click **Save**. Verify the date validation error triggers.
- **Earlier tasks needed:** Task 2

---

### Task 5: Overlapping Booking Prevention Constraint [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Python `@api.constrains('date_start', 'date_end', 'state', 'line_ids')` on `rental.order` and `rental.order.line`.
  - Validates that the same equipment cannot be assigned to more than one active order (`confirmed`, `rented`, `overdue`) across overlapping date ranges.
- **How to check:**
  1. Create Order A for `"Hammer Drill"` from Oct 10 to Oct 15 and confirm it.
  2. Create Order B for `"Hammer Drill"` from Oct 12 to Oct 17.
  3. Try to confirm Order B. Verify that a `ValidationError` prevents confirmation, indicating the equipment is already booked for those dates.
- **Earlier tasks needed:** Task 4

---

### Task 6: Order Lifecycle Workflow & Equipment State Synchronization [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Action buttons in form `<header>`:
    - **Confirm** (`action_confirm`): moves draft order to `confirmed`.
    - **Start Rental** (`action_start_rental`): moves order to `rented` and updates all assigned equipment records to state `rented`.
    - **Cancel** (`action_cancel`): moves draft or confirmed order to `cancelled`.
  - Statusbar widget displaying the order state sequence.
- **How to check:**
  1. Open a draft order. Click **Confirm**. Verify state changes to **Confirmed**.
  2. Click **Start Rental**. Verify order state changes to **Rented**.
  3. Open **Rentals** > **Equipment**, find the rented equipment, and verify its state has automatically switched to **Rented**.
- **Earlier tasks needed:** Task 5

---

### Task 7: Maintenance Tracking & Return Wizard [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Model `rental.maintenance`: `equipment_id`, `date`, `description`, `cost`, `technician_id`, and `state` selection (`todo`, `done`, default `todo`).
  - Views and menu: "Rentals" > "Maintenance" (list and form views).
  - Transient model `rental.return.wizard`: `damaged` (boolean), `notes` (text).
  - Button **Return** on `rental.order` (visible when state is `rented`) opening the wizard.
  - Wizard logic:
    - If `damaged` is false: resets equipment to `available`.
    - If `damaged` is true: sets equipment to `maintenance` and generates a `rental.maintenance` record with the notes.
    - Sets order state to `returned`.
- **How to check:**
  1. Open an order in `rented` state and click the **Return** button.
  2. In the modal popup, check **Damaged** and type notes `"Motor overheating"`. Click **Confirm Return**.
  3. Verify order status is now **Returned**.
  4. Go to **Rentals** > **Equipment** and verify the tool is now in **Maintenance**.
  5. Go to **Rentals** > **Maintenance** and verify a new todo record exists with `"Motor overheating"`.
- **Earlier tasks needed:** Task 6

---

### Task 8: Orders Calendar, Kanban & Reporting Views [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Orders `<calendar>` view mapping `date_start` to `date_end` colored by state.
  - Orders `<kanban>` view grouped by `state` columns with progress bar.
  - Menu "Rentals" > "Reporting":
    - `<graph>` view showing monthly total rental revenue.
    - `<pivot>` view breaking down rental revenue and counts by equipment category.
- **How to check:**
  1. Navigate to **Rentals** > **Orders** and switch between the list, kanban, and calendar view modes.
  2. Open **Rentals** > **Reporting**. Verify the revenue bar chart appears.
  3. Switch to the pivot table and verify grouping by equipment category and month.
- **Earlier tasks needed:** Task 7

---

### Task 9: Rental Contract PDF Report & Email Templates [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - QWeb PDF document "Rental Contract" (`action_report_rental_contract`) printable from `rental.order` displaying order details, equipment lines, terms, and signature lines.
  - Automated mail templates (`mail.template`):
    - "Rental Confirmed": sent upon order confirmation with the contract PDF attached.
    - "Return Due Tomorrow": reminder email with rental details.
- **How to check:**
  1. Open a confirmed order and click the **Print** menu > **Rental Contract**. Verify the PDF generates and downloads cleanly.
  2. Confirm an order and check Mailpit at `http://localhost:8025` to confirm the email was received with the attached PDF contract.
- **Earlier tasks needed:** Task 6

---

### Task 10: Automated Crons (Overdue Marker & Due Reminders) [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - Scheduled Action `ir.cron` 1: "Rental: Mark Overdue Orders" running daily. Finds orders in `rented` state where `date_end < today` and marks them as `overdue`.
  - Scheduled Action `ir.cron` 2: "Rental: Send Return Reminders" running daily. Finds orders ending tomorrow and triggers the "Return Due Tomorrow" email template.
- **How to check:**
  1. Create an order with `date_end` set to yesterday in `rented` state.
  2. Navigate to **Settings** > **Technical** > **Scheduled Actions**, locate "Rental: Mark Overdue Orders", and click **Run Manually**.
  3. Return to the order and verify its state has changed to **Overdue**.
  4. Check Mailpit to verify reminder emails were generated.
- **Earlier tasks needed:** Task 9

---

### Task 11: Sale & Invoicing Integration [COMPLETED]
- **Module:** `rental_sale`
- **What to build:**
  - New module `rental_sale` depending on `rental_core` and `sale`.
  - Inherit `rental.order` to add button **Create Invoice** (active on `returned` orders).
  - Business logic: generates a linked `sale.order` with rental line items, confirms it, generates the customer invoice (`account.move`), and links it.
  - Smart button on `rental.order` showing linked invoices count and opening them.
- **How to check:**
  1. Install `rental_sale`.
  2. Open an order in `returned` state and click **Create Invoice**.
  3. Verify a notification appears and the smart button **Invoices (1)** displays on the rental order.
  4. Click the smart button to open the draft/posted customer invoice matching the rental total.
- **Earlier tasks needed:** Task 7

---

### Task 12: Customer Portal & Online Rental Pages [COMPLETED]
- **Module:** `rental_website`
- **What to build:**
  - New module `rental_website` depending on `rental_core` and `portal`.
  - Public route `/rental`: public catalog page listing available equipment with images and daily rates.
  - Public route `/rental/book`: booking request form allowing public visitors to choose equipment, dates, and contact details.
  - Customer Portal route `/my/rentals`: dedicated portal page for logged-in portal users listing their own rentals, states, and downloading their contract PDF.
- **How to check:**
  1. Install `rental_website`.
  2. In a browser/incognito window, visit `http://localhost:8069/rental` as a public visitor to view equipment cards.
  3. Submit a booking via `/rental/book`. Verify a new draft order is created in Odoo.
  4. Log in as a portal user and visit `http://localhost:8069/my/rentals` to verify personal orders and contract download links.
- **Earlier tasks needed:** Task 9

---

### Task 13: Headless API Endpoints for External Clients [COMPLETED]
- **Module:** `rental_core`
- **What to build:**
  - JSON-RPC controller routes (`type='jsonrpc'`):
    - `/api/rental/equipment`: lists all equipment with category names, daily prices, and images.
    - `/api/rental/check_availability`: takes `equipment_id`, `date_start`, `date_end` and returns `{available: true/false}`.
    - `/api/rental/book`: creates a new draft `rental.order` with specified equipment lines and customer information.
- **How to check:**
  1. Use curl or Postman to send a JSON-RPC request to `http://localhost:8069/api/rental/equipment`.
  2. Verify a JSON payload returns the active equipment list.
  3. Send an availability check for booked dates and verify `{available: false}` is returned.
- **Earlier tasks needed:** Task 5

---

### Task 14: Headless Next.js Web App [COMPLETED]
- **Module:** `./web` (Next.js Application)
- **What to build:**
  - Initialize Next.js project in `./web`.
  - Catalog page (`/`): responsive equipment grid showing categories, specs, and daily rates.
  - Equipment detail page (`/equipment/[id]`): date range picker calling `/api/rental/check_availability` to show live availability badges.
  - Booking form checkout page: collects customer details and submits order to `/api/rental/book`.
- **How to check:**
  1. In `./web`, run `npm run dev` and open `http://localhost:3000`.
  2. Browse equipment, pick dates on the detail page to verify the availability badge reflects the backend calendar.
  3. Submit a booking form and verify the new draft order instantly appears in Odoo backend under **Rentals** > **Orders**.
- **Earlier tasks needed:** Task 13
