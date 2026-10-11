from odoo import api, fields, models


class RentalOrderLine(models.Model):
    _name = 'rental.order.line'
    _description = 'Rental Order Line'
    _order = 'id'

    order_id = fields.Many2one(
        'rental.order',
        string='Rental Order',
        required=True,
        ondelete='cascade',
        index=True,
    )
    equipment_id = fields.Many2one(
        'rental.equipment',
        string='Equipment',
        required=True,
        ondelete='restrict',
    )
    currency_id = fields.Many2one(
        related='order_id.currency_id',
        string='Currency',
        store=True,
    )
    category_id = fields.Many2one(
        related='equipment_id.category_id',
        string='Category',
        store=True,
    )
    daily_price = fields.Monetary(
        string='Daily Price',
        currency_field='currency_id',
        required=True,
        default=0.0,
    )
    days = fields.Integer(
        related='order_id.days',
        string='Days',
        store=True,
    )
    subtotal = fields.Monetary(
        string='Subtotal',
        compute='_compute_subtotal',
        store=True,
        currency_field='currency_id',
    )

    @api.onchange('equipment_id')
    def _onchange_equipment_id(self):
        if self.equipment_id:
            self.daily_price = self.equipment_id.daily_price

    @api.depends('daily_price', 'days', 'order_id.days')
    def _compute_subtotal(self):
        for line in self:
            rental_days = line.order_id.days if line.order_id else (line.days or 1)
            line.subtotal = (line.daily_price or 0.0) * (rental_days or 1)

    @api.constrains('equipment_id', 'order_id')
    def _check_equipment_line_overlap(self):
        for line in self:
            if line.order_id and line.order_id.state in ['confirmed', 'rented', 'overdue']:
                line.order_id._check_equipment_overlap()
