from odoo import fields, models


class RentalEquipment(models.Model):
    _name = 'rental.equipment'
    _description = 'Rental Equipment'
    _order = 'name'

    name = fields.Char(string='Equipment Name', required=True)
    code = fields.Char(string='Equipment Code', required=True, copy=False, index=True)
    category_id = fields.Many2one(
        'rental.category',
        string='Category',
        required=True,
        ondelete='restrict',
    )
    image = fields.Binary(string='Image', attachment=True)
    currency_id = fields.Many2one(
        'res.currency',
        string='Currency',
        default=lambda self: self.env.company.currency_id,
    )
    daily_price = fields.Monetary(
        string='Daily Price',
        currency_field='currency_id',
        required=True,
        default=0.0,
    )
    state = fields.Selection(
        [
            ('available', 'Available'),
            ('rented', 'Rented'),
            ('maintenance', 'Maintenance'),
        ],
        string='Status',
        default='available',
        required=True,
        copy=False,
    )
    notes = fields.Text(string='Notes')
    active = fields.Boolean(string='Active', default=True)

    rental_count = fields.Integer(
        string='Rental Count',
        compute='_compute_rental_count',
    )

    _code_uniq = models.Constraint(
        'unique (code)',
        'Equipment code must be unique!',
    )

    def _compute_rental_count(self):
        for rec in self:
            rec.rental_count = self.env['rental.order.line'].search_count([
                ('equipment_id', '=', rec.id),
            ])

    def action_view_rentals(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': self.env._('Rental Lines'),
            'res_model': 'rental.order.line',
            'view_mode': 'list,form',
            'domain': [('equipment_id', '=', self.id)],
            'context': {'default_equipment_id': self.id},
        }
