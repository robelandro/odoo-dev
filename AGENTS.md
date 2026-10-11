# AGENTS.md — Odoo 20 module development

## Target version
- This project targets **Odoo 20.0** (running in Docker). Never write code in Odoo 14/15/16/17 style.
- Your training data is mostly older Odoo. When unsure, **do not guess from memory**: check [ODOO20_SYNTAX.md](file:///home/nfta/Desktop/Person/personal-and-learning/Odoo/ODOO20_SYNTAX.md) first.

## Primary syntax & coding reference (`ODOO20_SYNTAX.md`)
- Always read and follow [ODOO20_SYNTAX.md](file:///home/nfta/Desktop/Person/personal-and-learning/Odoo/ODOO20_SYNTAX.md) before writing any model, view, controller, security rule, or test.
- `ODOO20_SYNTAX.md` is our curated local reference for verified Odoo 20 patterns, structure, and changes.

## Inspecting core source (via Docker)
- To avoid keeping the large ~1.5GB Odoo source on host disk, inspect the authoritative source directly inside the running Docker container:
  ```bash
  docker compose exec odoo grep -rn "<pattern>" /usr/lib/python3/dist-packages/odoo/addons/<module> --include=*.py --include=*.xml | head -20
  ```
- Look only in 1–2 similar core modules (e.g. `base`, `mail`, `account`, `sale`, `product`).
- Ignore: `i18n/`, `*.po`, `*.pot`, `static/lib/`, images, and unrelated apps.

## Live introspection via MCP
- The `odoo` MCP server (`mcp-server-odoo`) is configured in `mcp_config.json`.
- Use it to inspect live model schemas, field types, and relational fields on `mydb` at runtime.

## Workflow rules
1. Before writing any model, view, security rule, or JS, check [ODOO20_SYNTAX.md](file:///home/nfta/Desktop/Person/personal-and-learning/Odoo/ODOO20_SYNTAX.md). If needed, verify in the container via Docker exec.
2. Work in small steps: one model or one view at a time. Install/update and test after each step.
3. If a module update shows a warning or traceback, read it fully, fix the root cause, and do not silence it.
4. When you find a confirmed Odoo 20 pattern or fix a version mistake, add it to the "Verified Odoo 20 patterns" section below and update `ODOO20_SYNTAX.md`.
5. Never invent fields, methods, or XML tags.

## Module structure
- Module folder lives in the custom addons path: `./addons/<module_name>/`
- Required: `__init__.py`, `__manifest__.py`, `models/`, `views/`, `security/ir.model.access.csv`
- List every data/view/security file in `__manifest__.py` under `data`, in load order (security first, then views, then menus).
- Set `'version'` (e.g. `'20.0.1.0.0'`), `'depends'` correctly, and `'license'` (e.g. `'LGPL-3'`).

## Old patterns to avoid (see ODOO20_SYNTAX.md for details)
| Avoid (old) | Use instead (new) |
|---|---|
| `attrs="{'invisible': [...]}"`, `states="..."` in views | Direct attributes: `invisible="state != 'draft'"`, `readonly="..."`, `required="..."` |
| `<tree>` views, `view_mode="tree,form"` | `<list>` views, `view_mode="list,form"` |
| `name_get()` | `_compute_display_name()` |
| `<div class="oe_chatter">...</div>` | `<chatter/>` |
| `_sql_constraints = [...]` | `models.Constraint(...)` declarations |
| `read_group()` | `_read_group()` / `formatted_read_group()` |
| `check_access_rights()` / `check_access_rule()` | `check_access()` |
| Raw SQL strings in `cr.execute(...)` | `odoo.tools.SQL` objects |
| `groups_id` on users | `group_ids` |
| `type='json'` in `@http.route` | `type='jsonrpc'` |
| Legacy widgets / `odoo.define(...)` JS | OWL components and ES modules |
| `@api.model` create override with single `vals` | `@api.model_create_multi` with `vals_list` |
| Tuple commands like `(0, 0, {...})` | `Command.create(...)`, `Command.link(...)`, etc. (`from odoo import Command`) |

## Python style
- Use `from odoo import api, fields, models, Command, _`
- Use `_description` on every model.
- Use `_inherit` for extending, `_name` for new models.
- Add `tracking=True` only on fields that need chatter tracking.
- Use `@api.depends`, `@api.constrains`, `@api.onchange` correctly; computed fields need `store=True` only if they must be searchable/groupable.
- Raise `UserError` / `ValidationError` with translatable messages: `self.env._("...")` or `_("...")`.
- Add access rules (`ir.model.access.csv`) and record rules for every new model.

## Running and testing (Docker)
Project configuration:

- Compose file: `docker-compose.yml`
- Odoo service name: `odoo`
- Database name: `mydb`
- Custom addons path: `./addons/`
- Update a module:
  `docker compose exec odoo odoo -d mydb -u <module_name> --stop-after-init`
- Install a module:
  `docker compose exec odoo odoo -d mydb -i <module_name> --stop-after-init`
- View logs:
  `docker compose logs -f odoo`
- Run module tests:
  `docker compose exec odoo odoo -d mydb -u <module_name> --test-tags /<module_name> --stop-after-init`

After every change: update the module, read the log for errors and deprecation warnings, fix them, then continue.

## Tests
- Write tests in `tests/` using `odoo.tests.common.TransactionCase`.
- Register tests in `tests/__init__.py`.
- Add at least one test per business rule (for example computed totals, constraints, state transitions).

## Verified Odoo 20 patterns
### Security Groups & Privileges (`res.groups.privilege`)
`category_id` is no longer on `res.groups`. Instead, link groups to an `ir.module.category` via `res.groups.privilege`:
```xml
<record model="res.groups.privilege" id="res_groups_privilege_my_app">
    <field name="name">My App</field>
    <field name="category_id" ref="module_category_my_app"/>
    <field name="sequence">10</field>
</record>
<record id="group_my_app_user" model="res.groups">
    <field name="name">User</field>
    <field name="privilege_id" ref="res_groups_privilege_my_app"/>
    <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
</record>
```

### Access Rules (`security/ir.access.csv`)
File is named `ir.access.csv` (not `ir.model.access.csv`). Header and syntax:
```csv
id,name,model_id,group_id/id,operation,domain
access_my_model_user,my.model.user,my.model,my_module.group_my_app_user,cru,
access_my_model_manager,my.model.manager,my.model,my_module.group_my_app_manager,crud,
```
- `model_id`: technical dot-name of the model (`my.model`).
- `operation`: permission letters (`c` create, `r` read, `u` update, `d` delete).
- `domain`: optional inline domain filter.

### Report Actions (`ir.actions.report`)
In Odoo 20, `report_file` has been removed. Use `report_name`:
```xml
<record id="action_report_my_model" model="ir.actions.report">
    <field name="name">My Report</field>
    <field name="model">my.model</field>
    <field name="report_type">qweb-pdf</field>
    <field name="report_name">my_module.report_my_model</field>
    <field name="print_report_name">'Report - %s' % (object.name)</field>
    <field name="binding_model_id" ref="my_module.model_my_model"/>
    <field name="binding_type">report</field>
</record>
```

### Mail Templates (`mail.template`)
- `report_template` (many2one) was replaced by `report_template_ids` (many2many):
  `<field name="report_template_ids" eval="[(4, ref('my_module.action_report_my_model'))]"/>`
- Ensure the model defines `company_id` if referencing `object.company_id.name` in email subject or body.
- For recipient resolution, implement `_mail_get_partner_fields` on models inheriting `mail.thread`.
