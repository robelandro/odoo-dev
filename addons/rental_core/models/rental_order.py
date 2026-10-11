from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class RentalOrder(models.Model):
    _name = 'rental.order'
    _description = 'Rental Order'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name desc, id desc'

    name = fields.Char(
        string='Order Reference',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: _('New'),
    )
    customer_id = fields.Many2one(
        'res.partner',
        string='Customer',
        required=True,
        tracking=True,
    )
    user_id = fields.Many2one(
        'res.users',
        string='Responsible Staff',
        default=lambda self: self.env.user,
        tracking=True,
    )
    currency_id = fields.Many2one(
        'res.currency',
        string='Currency',
        default=lambda self: self.env.company.currency_id,
    )
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        default=lambda self: self.env.company,
        required=True,
    )
    date_start = fields.Date(
        string='Start Date',
        required=True,
        default=fields.Date.context_today,
        tracking=True,
    )
    date_end = fields.Date(
        string='End Date',
        required=True,
        default=fields.Date.context_today,
        tracking=True,
    )
    days = fields.Integer(
        string='Rental Days',
        compute='_compute_days',
        store=True,
    )
    line_ids = fields.One2many(
        'rental.order.line',
        'order_id',
        string='Order Lines',
        copy=True,
    )
    total = fields.Monetary(
        string='Total Amount',
        compute='_compute_total',
        store=True,
        currency_field='currency_id',
        tracking=True,
    )
    category_id = fields.Many2one(
        'rental.category',
        string='Category',
        compute='_compute_category_id',
        store=True,
    )
    state = fields.Selection(
        [
            ('draft', 'Draft'),
            ('confirmed', 'Confirmed'),
            ('rented', 'Rented'),
            ('overdue', 'Overdue'),
            ('returned', 'Returned'),
            ('cancelled', 'Cancelled'),
        ],
        string='Status',
        default='draft',
        required=True,
        tracking=True,
        copy=False,
    )

    @api.depends('date_start', 'date_end')
    def _compute_days(self):
        for rec in self:
            if rec.date_start and rec.date_end:
                diff = (rec.date_end - rec.date_start).days
                rec.days = diff if diff > 0 else 1
            else:
                rec.days = 1

    @api.depends('line_ids.subtotal')
    def _compute_total(self):
        for rec in self:
            rec.total = sum(rec.line_ids.mapped('subtotal'))

    @api.depends('line_ids.equipment_id.category_id')
    def _compute_category_id(self):
        for rec in self:
            categories = rec.line_ids.mapped('equipment_id.category_id')
            rec.category_id = categories[0].id if categories else False

    @api.constrains('date_start', 'date_end')
    def _check_dates(self):
        for rec in self:
            if rec.date_start and rec.date_end and rec.date_end < rec.date_start:
                raise ValidationError(self.env._('End Date must be on or after Start Date.'))

    @api.constrains('date_start', 'date_end', 'state', 'line_ids')
    def _check_equipment_overlap(self):
        for order in self:
            if order.state not in ['confirmed', 'rented', 'overdue']:
                continue
            if not order.date_start or not order.date_end:
                continue

            # Prevent duplicate equipment within the same order
            equipment_list = [line.equipment_id.id for line in order.line_ids if line.equipment_id]
            if len(equipment_list) != len(set(equipment_list)):
                raise ValidationError(self.env._('The same equipment cannot be selected multiple times in one order.'))

            if not equipment_list:
                continue

            # Check overlap with any other active order
            overlapping_lines = self.env['rental.order.line'].search([
                ('id', 'not in', order.line_ids.ids),
                ('equipment_id', 'in', equipment_list),
                ('order_id.state', 'in', ['confirmed', 'rented', 'overdue']),
                ('order_id.date_start', '<=', order.date_end),
                ('order_id.date_end', '>=', order.date_start),
            ])

            if overlapping_lines:
                conflict_equipment = ', '.join(overlapping_lines.mapped('equipment_id.name'))
                conflict_orders = ', '.join(overlapping_lines.mapped('order_id.name'))
                raise ValidationError(
                    self.env._(
                        'Equipment "%(equipment)s" is already booked in active order(s) %(orders)s between %(start)s and %(end)s.',
                        equipment=conflict_equipment,
                        orders=conflict_orders,
                        start=order.date_start,
                        end=order.date_end,
                    )
                )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self.env['ir.sequence'].next_by_code('rental.order') or _('New')
        return super().create(vals_list)

    def _mail_get_partner_fields(self, introspect_fields=False):
        return ['customer_id']

    def action_confirm(self):
        template = self.env.ref('rental_core.mail_template_rental_confirmation', raise_if_not_found=False)
        for order in self:
            if order.state != 'draft':
                raise UserError(self.env._('Only draft orders can be confirmed.'))
            if not order.line_ids:
                raise UserError(self.env._('Cannot confirm an order without equipment lines.'))
            order.state = 'confirmed'
            if template:
                template.send_mail(order.id, force_send=True)
        return True

    def action_start_rental(self):
        for order in self:
            if order.state != 'confirmed':
                raise UserError(self.env._('Only confirmed orders can be started.'))
            equipments = order.line_ids.mapped('equipment_id')
            maintenance_eq = equipments.filtered(lambda eq: eq.state == 'maintenance')
            if maintenance_eq:
                raise UserError(
                    self.env._(
                        'Cannot start rental: equipment (%s) is under maintenance.',
                        ', '.join(maintenance_eq.mapped('name')),
                    )
                )
            order.state = 'rented'
            equipments.write({'state': 'rented'})
        return True

    def action_cancel(self):
        for order in self:
            if order.state not in ['draft', 'confirmed']:
                raise UserError(self.env._('Only draft or confirmed orders can be cancelled.'))
            order.state = 'cancelled'
        return True

    def action_set_draft(self):
        for order in self:
            if order.state != 'cancelled':
                raise UserError(self.env._('Only cancelled orders can be reset to draft.'))
            order.state = 'draft'
        return True

    def action_open_return_wizard(self):
        self.ensure_one()
        if self.state not in ['rented', 'overdue']:
            raise UserError(self.env._('Only rented or overdue orders can be returned.'))
        return {
            'name': self.env._('Return Equipment'),
            'type': 'ir.actions.act_window',
            'res_model': 'rental.return.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_order_id': self.id},
        }

    @api.model
    def _cron_mark_overdue(self):
        today = fields.Date.context_today(self)
        overdue_orders = self.search([
            ('state', '=', 'rented'),
            ('date_end', '<', today),
        ])
        for order in overdue_orders:
            order.state = 'overdue'
            order.message_post(body=self.env._('Order marked as overdue because end date %s has passed.') % order.date_end)
        return True

    @api.model
    def _cron_send_return_reminders(self):
        from datetime import timedelta
        tomorrow = fields.Date.context_today(self) + timedelta(days=1)
        reminder_orders = self.search([
            ('state', 'in', ['rented', 'confirmed']),
            ('date_end', '=', tomorrow),
        ])
        template = self.env.ref('rental_core.mail_template_rental_due_reminder', raise_if_not_found=False)
        if template:
            for order in reminder_orders:
                template.send_mail(order.id, force_send=True)
        return True
