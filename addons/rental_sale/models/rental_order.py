from odoo import api, fields, models, Command, _
from odoo.exceptions import UserError


class RentalOrder(models.Model):
    _inherit = 'rental.order'

    sale_order_id = fields.Many2one(
        'sale.order',
        string='Sale Order',
        readonly=True,
        copy=False,
    )
    invoice_ids = fields.Many2many(
        'account.move',
        string='Invoices',
        readonly=True,
        copy=False,
    )
    invoice_count = fields.Integer(
        string='Invoice Count',
        compute='_compute_invoice_count',
    )

    @api.depends('invoice_ids', 'sale_order_id.invoice_ids')
    def _compute_invoice_count(self):
        for rec in self:
            all_invoices = rec.invoice_ids | (rec.sale_order_id.invoice_ids if rec.sale_order_id else self.env['account.move'])
            rec.invoice_count = len(all_invoices)

    def action_create_invoice(self):
        for order in self:
            if order.state != 'returned':
                raise UserError(self.env._('Invoices can only be created for returned orders.'))
            if order.invoice_count > 0:
                raise UserError(self.env._('An invoice has already been generated for this rental order.'))

            product = self.env['product.product'].search([('default_code', '=', 'RENTAL_SERVICE')], limit=1)
            if not product:
                product = self.env['product.product'].create({
                    'name': 'Equipment Rental Service',
                    'default_code': 'RENTAL_SERVICE',
                    'type': 'service',
                    'invoice_policy': 'order',
                })

            so_lines = []
            for line in order.line_ids:
                desc = f"Rental: {line.equipment_id.name} [{line.equipment_id.code}] ({order.days} days @ {line.daily_price}/day)"
                so_lines.append(Command.create({
                    'product_id': product.id,
                    'name': desc,
                    'product_uom_qty': 1,
                    'price_unit': line.subtotal,
                }))

            sale_order = self.env['sale.order'].create({
                'partner_id': order.customer_id.id,
                'origin': order.name,
                'order_line': so_lines,
            })
            sale_order.action_confirm()
            invoices = sale_order._create_invoices()

            order.write({
                'sale_order_id': sale_order.id,
                'invoice_ids': [Command.set(invoices.ids)],
            })

            order.message_post(body=self.env._('Invoice generated via Sale Order %s.') % sale_order.name)

        return self.action_view_invoices()

    def action_view_invoices(self):
        self.ensure_one()
        all_invoices = self.invoice_ids | (self.sale_order_id.invoice_ids if self.sale_order_id else self.env['account.move'])
        action = {
            'name': self.env._('Invoices'),
            'type': 'ir.actions.act_window',
            'res_model': 'account.move',
            'views': [(False, 'list'), (False, 'form')],
            'domain': [('id', 'in', all_invoices.ids)],
            'context': {'default_move_type': 'out_invoice'},
        }
        if len(all_invoices) == 1:
            action['views'] = [(False, 'form')]
            action['res_id'] = all_invoices.id
        return action
