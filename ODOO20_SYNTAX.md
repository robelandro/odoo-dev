# ODOO20_SYNTAX.md — Odoo 20 coding reference for the AI agent

Read this file together with `AGENTS.md` before writing any Odoo code.

## 0. How to trust this file (IMPORTANT)

Every rule below has a confidence label:

- **[OFFICIAL]** Listed in Odoo's official ORM changelog (docs: Developer > Reference > Server framework > ORM API > Changelog). Safe to rely on.
- **[ESTABLISHED 17–19]** A pattern introduced in Odoo 17, 18 or 19 that I am confident about, but I have not confirmed it for 20. **Verify in container core source before using.**
- **[ODOO 20 — UNVERIFIED]** Reported by secondary sources for Odoo 20. **Must be confirmed in container core source.**

If the core source shows a different pattern than this file, **core source wins.** Then update this file.

### Verification protocol (do this before writing any new kind of code)

To save disk space, the Odoo 20 source lives in the running Docker container. Inspect core modules on demand:
1. Search inside a similar core module:
   `docker compose exec odoo grep -rn "<keyword>" /usr/lib/python3/dist-packages/odoo/addons/<module>/ --include=*.py --include=*.xml | head -20`
2. Open or check only the matching lines.
3. Copy that pattern. Do not invent syntax.
4. If core uses something this file marks as "avoid", trust core and fix this file.

---

## 1. Version facts

- Odoo 20.0 was released in September 2026 (per secondary sources). Target `20.0` everywhere.
- **[OFFICIAL]** The old external XML-RPC and JSON-RPC APIs were scheduled for removal in Odoo 20.0. The replacement is the **JSON-2 API** (`/json/2/<model>/<method>`, with API-key bearer auth and an `X-Odoo-Database` header). Do not generate new XML-RPC/JSON-RPC client code.
- **[ODOO 20 — UNVERIFIED]** Reported for 20: record rules replaced by a domain on each access right; tracking values removed (tracking messages are generated on the fly); all AI features require IAP credits. Check `odoo-src/odoo/addons/base/security/` and `mail` before relying on any of these.
- Demo data is **not loaded by default** (since 18.3) **[OFFICIAL]**. When testing with demo data, create the DB with demo enabled explicitly.

---

## 2. Module structure

```
my_module/
├── __init__.py
├── __manifest__.py
├── models/
│   ├── __init__.py
│   └── my_model.py
├── views/
│   ├── my_model_views.xml
│   └── menus.xml
├── security/
│   └── ir.model.access.csv
├── data/
├── wizard/
├── report/
├── static/
│   └── description/icon.png
└── tests/
    ├── __init__.py
    └── test_my_model.py
```

`__init__.py` files import sub-packages:

```python
# my_module/__init__.py
from . import models
# models/__init__.py
from . import my_model
```

### `__manifest__.py` [ESTABLISHED 17–19]

```python
{
    'name': 'My Module',
    'version': '20.0.1.0.0',
    'category': 'Inventory',
    'summary': 'One-line summary',
    'description': """Longer description""",
    'author': 'Your Name',
    'license': 'LGPL-3',
    'depends': ['base', 'mail'],
    'data': [
        # Load order matters: security -> data -> views -> menus -> reports
        'security/ir.model.access.csv',
        'views/my_model_views.xml',
        'views/menus.xml',
    ],
    'demo': [],
    'assets': {
        'web.assets_backend': [
            'my_module/static/src/**/*',
        ],
    },
    'application': True,   # True only for a top-level app
    'installable': True,
}
```

- Every XML/CSV file must be listed in `data` (or `demo`).
- Every model referenced in a view must exist before that view loads.
- Every module in `depends` must be the one that defines what you use (for example `mail` for chatter, `product` for products).
- **[OFFICIAL]** `odoo` supports PEP-420 native namespaces (since 18.2). Do not add `__init__.py` to the repo root.

---

## 3. Models

### Basic model [ESTABLISHED 17–19]

```python
from odoo import api, fields, models, Command


class LibraryBook(models.Model):
    _name = 'library.book'
    _description = 'Library Book'
    _inherit = ['mail.thread', 'mail.activity.mixin']   # only if chatter is needed
    _order = 'name'

    name = fields.Char(string='Title', required=True, tracking=True)
    isbn = fields.Char(copy=False, index=True)
    active = fields.Boolean(default=True)
    price = fields.Monetary(currency_field='currency_id')
    currency_id = fields.Many2one(
        'res.currency',
        default=lambda self: self.env.company.currency_id,
    )
    state = fields.Selection(
        [('draft', 'Draft'), ('available', 'Available'), ('lost', 'Lost')],
        default='draft',
        required=True,
        tracking=True,
    )
    author_id = fields.Many2one('res.partner', string='Author', ondelete='restrict')
    tag_ids = fields.Many2many('library.tag', string='Tags')
    loan_ids = fields.One2many('library.loan', 'book_id', string='Loans')
    company_id = fields.Many2one(
        'res.company', default=lambda self: self.env.company,
    )
```

Rules:

- Always set `_description`.
- Use `_inherit` (string) to extend an existing model, `_name` for a new one. Use `_inherit` as a list for mixins.
- Many2one `ondelete`: `'restrict'`, `'cascade'`, or `'set null'`. Choose deliberately.
- Multi-company models need `company_id` and an appropriate access/record rule (see Section 9).
- **[ODOO 20 — UNVERIFIED]** Reported removal of tracking values. If `tracking=True` behaves differently, check `odoo-src/addons/mail/models/mail_thread.py`.

### Field attribute renames and notes

| Old | Current | Label |
|---|---|---|
| `group_operator='sum'` | `aggregator='sum'` | **[OFFICIAL]** (17.2) |
| `name_get()` | read/override `display_name` via `_compute_display_name` | **[OFFICIAL]** (deprecated 16.4) |
| `_name_search` overrides | implement `_search_display_name` | **[OFFICIAL]** (18.0) |
| `record._cr`, `record._context`, `record._uid` | `self.env.cr`, `self.env.context`, `self.env.uid` | **[OFFICIAL]** (deprecated 19.0) |
| `from odoo.osv import expression` | `Domain` API (see Section 7) | **[OFFICIAL]** (`odoo.osv` deprecated 19.0) |
| `read_group()` | `_read_group()` (backend) / `formatted_read_group()` (public) | **[OFFICIAL]** (18.2) |
| `check_access_rights()` + `check_access_rule()` | `check_access()`, `has_access()`, `_filtered_access()` | **[OFFICIAL]** (18.0) |

### Computed fields [ESTABLISHED 17–19]

```python
total = fields.Monetary(compute='_compute_total', store=True, currency_field='currency_id')

@api.depends('line_ids.price', 'line_ids.qty')
def _compute_total(self):
    for rec in self:
        rec.total = sum(line.price * line.qty for line in rec.line_ids)
```

- Always loop `for rec in self`.
- Always assign the computed field for every record, in every branch.
- `store=True` only if the field must be searched, grouped, or sorted. Otherwise leave it non-stored.
- Searchable non-stored fields: add `search='_search_xxx'`.
- **[OFFICIAL]** (19.1) `Field.compute_sql` can define SQL for a computed field so it can be grouped/sorted. Check `odoo-src` for exact usage before using it.

### Display name [OFFICIAL / ESTABLISHED]

```python
@api.depends('name', 'isbn')
def _compute_display_name(self):
    for rec in self:
        rec.display_name = f"[{rec.isbn}] {rec.name}" if rec.isbn else rec.name
```

Do **not** write `name_get()`.

### Constraints and indexes

**[OFFICIAL]** (18.1) Constraints and indexes are declared as **model attributes**. Check the exact declaration in `odoo-src` (for example, grep `models.Constraint` in `odoo-src/addons/product`).

Expected shape **[ESTABLISHED 18–19 — verify]**:

```python
class LibraryBook(models.Model):
    _name = 'library.book'

    _isbn_uniq = models.Constraint(
        'UNIQUE(isbn)',
        'The ISBN must be unique.',
    )
    _name_idx = models.Index('(name)')
```

Do **not** use the old `_sql_constraints = [...]` list unless core still does.

Python constraints:

```python
from odoo.exceptions import ValidationError

@api.constrains('price')
def _check_price(self):
    for rec in self:
        if rec.price < 0:
            raise ValidationError(self.env._("The price cannot be negative."))
```

### Translations [OFFICIAL]

Since 18.0, translation is available from the environment:

```python
raise UserError(self.env._("Something went wrong for %s", record.name))
```

Prefer `self.env._()` over importing `_` from `odoo`. (Check core: if core still uses `from odoo import _`, either works, but be consistent.)

### CRUD overrides [ESTABLISHED 17–19]

```python
@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        if not vals.get('isbn'):
            vals['isbn'] = self.env['ir.sequence'].next_by_code('library.book')
    return super().create(vals_list)

def write(self, vals):
    return super().write(vals)

@api.ondelete(at_uninstall=False)
def _unlink_except_lost(self):
    for rec in self:
        if rec.state == 'lost':
            raise UserError(self.env._("You cannot delete a lost book."))
```

- `create` always takes `vals_list` with `@api.model_create_multi`.
- Never override `unlink` just to block deletion. Use `@api.ondelete`.
- Always call `super()` with no arguments.

### x2many commands

```python
from odoo import Command

self.write({
    'tag_ids': [Command.link(tag.id)],
    'loan_ids': [Command.create({'borrower_id': partner.id})],
})
# Other commands: Command.update(id, vals), Command.delete(id),
# Command.unlink(id), Command.set(ids), Command.clear()
```

Do not use raw tuples such as `(0, 0, {...})`.

### Actions on records

```python
def action_mark_lost(self):
    self.write({'state': 'lost'})
    return True

def action_open_loans(self):
    self.ensure_one()
    return {
        'type': 'ir.actions.act_window',
        'name': self.env._("Loans"),
        'res_model': 'library.loan',
        'view_mode': 'list,form',
        'domain': [('book_id', '=', self.id)],
        'context': {'default_book_id': self.id},
    }
```

- `view_mode` uses **`list`**, not `tree` **[ESTABLISHED 18–19 — verify]**.
- **[OFFICIAL]** (18.2) `@api.private` marks Python methods that must not be callable over RPC. Use it on helper methods that are not buttons or API methods. Public method names (no leading underscore) are callable from the client. Prefix helpers with `_`.

### Reading and searching [OFFICIAL]

- `search_fetch()` and `fetch()` (16.2): search and populate the cache in one query.
- `search_count()` accepts a `limit` (16.0).
- Prefer `_read_group` for aggregation in backend code.

```python
groups = self.env['library.loan']._read_group(
    domain=[('state', '=', 'open')],
    groupby=['book_id'],
    aggregates=['__count'],
)
```

(Confirm the exact signature in `odoo-src/odoo/models.py` before use.)

---

## 4. Domains

**[OFFICIAL]**

- 18.1 introduced the `odoo.Domain` API for building and manipulating domains.
- 19.0 added support for dynamic dates in domains.
- 18.3: domain optimization is applied before `Field.search`; `=` and `in` are handled consistently.
- 19.3: a domain operator `access` can check permissions of the comodel (useful in access rules).

Plain list domains are still valid:

```python
domain = [('state', '=', 'available'), ('price', '>', 0)]
```

For building/combining domains, check `odoo-src/odoo/orm/domains.py` (or wherever `Domain` is defined in 20) and prefer the `Domain` class over `odoo.osv.expression`.

---

## 5. Raw SQL

**[OFFICIAL]** An `SQL` wrapper exists since 17.0 to prevent injection. Flushing is handled by `execute_query()` (17.1). A new SQL-building API arrived in 19.1.

Rules:

- **Never** build SQL by string formatting or f-strings with user data.
- Use the `SQL` object with parameters:

```python
from odoo.tools import SQL

query = SQL("SELECT id FROM %s WHERE name = %s", SQL.identifier('library_book'), name)
self.env.cr.execute(query)
```

- Check `odoo-src/odoo/tools/sql.py` for the 20 syntax before using.
- Prefer the ORM whenever possible.

---

## 6. Views (XML) — **verify against `odoo-src/addons/<core module>/views/`**

### General rules **[ESTABLISHED 17–19]**

- No more `attrs="{...}"` and no `states="..."`. Use direct attributes with Python-like expressions:
  `invisible="state != 'draft'"`, `readonly="state == 'lost'"`, `required="price > 0"`.
- List views use the **`<list>`** tag (not `<tree>`).
- Chatter uses **`<chatter/>`** (not `<div class="oe_chatter">...`).
- Always give records an `id` with the module prefix omitted inside the same module (`library_book_view_form`).

### Form view

```xml
<odoo>
    <record id="library_book_view_form" model="ir.ui.view">
        <field name="name">library.book.view.form</field>
        <field name="model">library.book</field>
        <field name="arch" type="xml">
            <form string="Book">
                <header>
                    <button name="action_mark_lost" string="Mark Lost" type="object"
                            invisible="state == 'lost'" class="btn-primary"/>
                    <field name="state" widget="statusbar" statusbar_visible="draft,available"/>
                </header>
                <sheet>
                    <widget name="web_ribbon" title="Archived" bg_color="text-bg-danger"
                            invisible="active"/>
                    <div class="oe_title">
                        <h1><field name="name" placeholder="Title"/></h1>
                    </div>
                    <group>
                        <group>
                            <field name="isbn"/>
                            <field name="author_id"/>
                        </group>
                        <group>
                            <field name="price"/>
                            <field name="currency_id" groups="base.group_multi_currency"/>
                            <field name="company_id" groups="base.group_multi_company"/>
                        </group>
                    </group>
                    <notebook>
                        <page string="Loans" name="loans">
                            <field name="loan_ids">
                                <list editable="bottom">
                                    <field name="borrower_id"/>
                                    <field name="date_out"/>
                                </list>
                            </field>
                        </page>
                    </notebook>
                </sheet>
                <chatter/>
            </form>
        </field>
    </record>
</odoo>
```

### List view

```xml
<record id="library_book_view_list" model="ir.ui.view">
    <field name="name">library.book.view.list</field>
    <field name="model">library.book</field>
    <field name="arch" type="xml">
        <list string="Books" decoration-muted="state == 'lost'">
            <field name="name"/>
            <field name="author_id"/>
            <field name="price" sum="Total"/>
            <field name="state" widget="badge"
                   decoration-success="state == 'available'"
                   decoration-danger="state == 'lost'"/>
            <field name="company_id" optional="hide"/>
        </list>
    </field>
</record>
```

### Search view

```xml
<record id="library_book_view_search" model="ir.ui.view">
    <field name="name">library.book.view.search</field>
    <field name="model">library.book</field>
    <field name="arch" type="xml">
        <search>
            <field name="name"/>
            <field name="isbn"/>
            <filter name="available" string="Available" domain="[('state', '=', 'available')]"/>
            <separator/>
            <filter name="archived" string="Archived" domain="[('active', '=', False)]"/>
            <group>
                <filter name="group_state" string="Status" context="{'group_by': 'state'}"/>
            </group>
        </search>
    </field>
</record>
```

### Kanban view — **high risk, verify**

The kanban template name has changed across versions (`kanban-box` in old versions; newer versions use a different template name). **Do not write a kanban view from memory.** Copy the structure of a current core kanban view from `odoo-src/addons/product/views/` or `odoo-src/addons/project/views/` and adapt it.

### Action and menu

```xml
<record id="library_book_action" model="ir.actions.act_window">
    <field name="name">Books</field>
    <field name="res_model">library.book</field>
    <field name="view_mode">list,form</field>
    <field name="search_view_id" ref="library_book_view_search"/>
    <field name="help" type="html">
        <p class="o_view_nocontent_smiling_face">Create your first book</p>
    </field>
</record>

<menuitem id="library_menu_root" name="Library" sequence="10"
          web_icon="my_module,static/description/icon.png"/>
<menuitem id="library_menu_books" name="Books" parent="library_menu_root"
          action="library_book_action" sequence="10"/>
```

### Inheriting views

```xml
<record id="res_partner_view_form_inherit_library" model="ir.ui.view">
    <field name="name">res.partner.view.form.inherit.library</field>
    <field name="model">res.partner</field>
    <field name="inherit_id" ref="base.view_partner_form"/>
    <field name="arch" type="xml">
        <xpath expr="//field[@name='phone']" position="after">
            <field name="library_card_no"/>
        </xpath>
    </field>
</record>
```

Always confirm the parent view's xml id exists in `odoo-src` (grep `id="view_partner_form"`), since core xml ids and structure change between versions.

---

## 7. Security — **[OFFICIAL / VERIFIED in Odoo 20]**

In Odoo 20, access rights use `ir.access.csv` and security groups use `res.groups.privilege`.

### Access Rules (`security/ir.access.csv`)
- Header: `id,name,model_id,group_id/id,operation,domain`
- `model_id`: technical model name directly (e.g. `library.book`, not `model_library_book`)
- `group_id/id`: external id of the group (e.g. `my_module.group_library_user`)
- `operation`: string of permission characters:
  - `c` = create
  - `r` = read
  - `u` = update (write)
  - `d` = delete (unlink)
  - Examples: `cru` (read, create, write; no delete), `crud` (full access), `r` (read-only)
- `domain`: optional inline row-level security domain filter (leave empty for global/unfiltered).

```csv
id,name,model_id,group_id/id,operation,domain
access_library_book_user,library.book.user,library.book,my_module.group_library_user,cru,
access_library_book_manager,library.book.manager,library.book,my_module.group_library_manager,crud,
```

### Groups & Privileges (`res.groups.privilege`)
`category_id` was removed from `res.groups`. Link the group to an `ir.module.category` via `res.groups.privilege`:

```xml
<record model="ir.module.category" id="module_category_library">
    <field name="name">Library</field>
    <field name="sequence">25</field>
</record>

<record model="res.groups.privilege" id="res_groups_privilege_library">
    <field name="name">Library</field>
    <field name="category_id" ref="module_category_library"/>
    <field name="sequence">10</field>
</record>

<record id="group_library_user" model="res.groups">
    <field name="name">User</field>
    <field name="privilege_id" ref="res_groups_privilege_library"/>
    <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
</record>

<record id="group_library_manager" model="res.groups">
    <field name="name">Manager</field>
    <field name="privilege_id" ref="res_groups_privilege_library"/>
    <field name="implied_ids" eval="[(4, ref('group_library_user'))]"/>
    <field name="user_ids" eval="[(4, ref('base.user_root')), (4, ref('base.user_admin'))]"/>
</record>
```

---

## 8. Wizards (transient models)

```python
class LibraryLostWizard(models.TransientModel):
    _name = 'library.lost.wizard'
    _description = 'Mark Books Lost Wizard'

    book_ids = fields.Many2many('library.book')
    reason = fields.Text(required=True)

    def action_confirm(self):
        self.book_ids.write({'state': 'lost'})
        return {'type': 'ir.actions.act_window_close'}
```

Open it from a button with `context="{'default_book_ids': [(6, 0, ...)]}"` or from Python using `Command.set(...)` in the default value. Transient models also need access rules (check core for whether they still do in 20).

---

## 9. Controllers (HTTP)

**[OFFICIAL]** (18.1) JSON controllers were renamed to `jsonrpc`. The route `type='json'` becomes `type='jsonrpc'`.

```python
from odoo import http
from odoo.http import request


class LibraryController(http.Controller):

    @http.route('/library/books', type='jsonrpc', auth='user')
    def list_books(self):
        books = request.env['library.book'].search_read([], ['name', 'isbn'])
        return books

    @http.route('/library/ping', type='http', auth='public', methods=['GET'])
    def ping(self):
        return request.make_response('ok')
```

- `auth='user'` for logged-in users, `'public'` for anonymous, `'none'` rarely.
- Never use `sudo()` to bypass access checks unless you have explicitly validated the user's right to the data.

---

## 10. Scheduled actions (cron)

**[OFFICIAL]** (18.3) A new cron API lets a job report progress and commit in batches. Check `odoo-src/odoo/addons/base/models/ir_cron.py` and a core example before writing a long-running cron.

```xml
<record id="ir_cron_library_overdue" model="ir.cron">
    <field name="name">Library: flag overdue loans</field>
    <field name="model_id" ref="model_library_loan"/>
    <field name="state">code</field>
    <field name="code">model._cron_flag_overdue()</field>
    <field name="interval_number">1</field>
    <field name="interval_type">days</field>
</record>
```

Some older fields (such as `numbercall`) were removed in newer versions. Copy a current core cron record from `odoo-src` instead of writing from memory.

---

## 11. Reports (QWeb PDF) & Mail Templates

### Report Action (`ir.actions.report`) [OFFICIAL]
- In Odoo 20, `report_file` has been **removed**. Use `report_name`.
```xml
<record id="action_report_rental_contract" model="ir.actions.report">
    <field name="name">Rental Contract</field>
    <field name="model">rental.order</field>
    <field name="report_type">qweb-pdf</field>
    <field name="report_name">rental_core.report_rental_contract</field>
    <field name="print_report_name">'Rental Contract - %s' % (object.name)</field>
    <field name="binding_model_id" ref="rental_core.model_rental_order"/>
    <field name="binding_type">report</field>
</record>
```

### Mail Templates (`mail.template`) [OFFICIAL]
- Attach reports via `report_template_ids` (m2m field, not old `report_template` m2o):
  `<field name="report_template_ids" eval="[(4, ref('my_module.action_report_contract'))]"/>`
- Ensure model defines `company_id` if evaluating `{{ object.company_id.name }}`.
- Model recipient discovery: implement `_mail_get_partner_fields(self, introspect_fields=False)` on models inheriting `mail.thread`.

---

## 12. Frontend (JS / OWL)

**[ESTABLISHED 17–19 — verify]**

- Use **OWL** components and ES modules. Do not use `odoo.define(...)` legacy modules.
- Register assets under `'assets'` in the manifest (see Section 2).
- Register components in the proper registry (fields, views, client actions). The registry API changes between versions, so copy a current example from `odoo-src/addons/web/static/src/` or a small core addon.
- Do not use jQuery for new backend code.

---

## 13. Tests

```python
from odoo.tests import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestLibraryBook(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.book = cls.env['library.book'].create({'name': 'Test', 'isbn': '123'})

    def test_mark_lost(self):
        self.book.action_mark_lost()
        self.assertEqual(self.book.state, 'lost')
```

- Register tests in `tests/__init__.py`: `from . import test_my_model`.
- Run: `odoo -d <DB> -u my_module --test-tags /my_module --stop-after-init`.
- Check core tests for the current base-class import path in Odoo 20.

---

## 14. CLI / environment

- **[OFFICIAL]** (18.4) The `--reinit` option reinitializes modules. Check `odoo --help` in the container for the exact flag name.
- **[OFFICIAL]** (18.3) Demo data is off by default.
- Always read the Odoo log after `-u`. Warnings such as "deprecated" tell you which old syntax you used.

---

## 15. Pre-submit checklist for every change

- [ ] I found a similar Odoo 20 core example and followed its pattern.
- [ ] No `attrs=`, no `states=`, no `<tree>`, no `name_get`, no `_sql_constraints` (unless core still uses them).
- [ ] No `record._cr` / `_context` / `_uid`; I used `self.env.cr` / `self.env.context` / `self.env.uid`.
- [ ] No `odoo.osv.expression`; used the `Domain` API (or plain domains).
- [ ] `create` uses `@api.model_create_multi`; deletion rules use `@api.ondelete`.
- [ ] x2many writes use `Command`.
- [ ] Every new model has `_description` and access rules (in the shape Odoo 20 uses).
- [ ] Every new file is listed in `__manifest__.py` in the right order.
- [ ] I updated the module and read the log: no errors, no deprecation warnings.
- [ ] I added any newly confirmed pattern to the "Verified Odoo 20 patterns" section of `AGENTS.md`.

## 16. Sources to consult (in order)

1. `odoo-src/` (the real Odoo 20 code) — highest authority.
2. Official ORM changelog: https://www.odoo.com/documentation/master/developer/reference/backend/orm/changelog.html
3. Official developer docs: https://www.odoo.com/documentation/master/developer.html
4. Odoo 20 release notes (functional changes, by app).
