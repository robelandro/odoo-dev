from odoo import fields, models


class RentalMaintenance(models.Model):
    _name = 'rental.maintenance'
    _description = 'Equipment Maintenance'
    _order = 'date desc, id desc'

    equipment_id = fields.Many2one(
        'rental.equipment',
        string='Equipment',
        required=True,
        ondelete='cascade',
        index=True,
    )
    date = fields.Date(
        string='Maintenance Date',
        required=True,
        default=fields.Date.context_today,
    )
    description = fields.Text(
        string='Issue / Work Description',
        required=True,
    )
    currency_id = fields.Many2one(
        'res.currency',
        string='Currency',
        default=lambda self: self.env.company.currency_id,
    )
    cost = fields.Monetary(
        string='Maintenance Cost',
        currency_field='currency_id',
        default=0.0,
    )
    technician_id = fields.Many2one(
        'res.users',
        string='Technician',
        default=lambda self: self.env.user,
    )
    state = fields.Selection(
        [
            ('todo', 'To Do'),
            ('done', 'Done'),
        ],
        string='Status',
        default='todo',
        required=True,
    )

    def action_mark_done(self):
        for rec in self:
            rec.state = 'done'
            # If equipment has no other pending maintenance, restore to available
            pending = self.search_count([
                ('equipment_id', '=', rec.equipment_id.id),
                ('state', '=', 'todo'),
            ])
            if pending == 0 and rec.equipment_id.state == 'maintenance':
                rec.equipment_id.state = 'available'
        return True

    def action_set_todo(self):
        for rec in self:
            rec.state = 'todo'
            rec.equipment_id.state = 'maintenance'
        return True
