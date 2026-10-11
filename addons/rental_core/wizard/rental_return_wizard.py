from odoo import fields, models, _
from odoo.exceptions import UserError


class RentalReturnWizard(models.TransientModel):
    _name = 'rental.return.wizard'
    _description = 'Return Equipment Wizard'

    order_id = fields.Many2one(
        'rental.order',
        string='Rental Order',
        required=True,
        default=lambda self: self.env.context.get('active_id'),
    )
    damaged = fields.Boolean(
        string='Equipment Damaged?',
        default=False,
        help='Check if any equipment was returned damaged or requiring repair.',
    )
    notes = fields.Text(
        string='Return Notes / Damage Details',
    )

    def action_confirm_return(self):
        self.ensure_one()
        order = self.order_id
        if not order:
            raise UserError(self.env._('No rental order associated with this return.'))

        equipments = order.line_ids.mapped('equipment_id')

        if self.damaged:
            equipments.write({'state': 'maintenance'})
            for eq in equipments:
                self.env['rental.maintenance'].create({
                    'equipment_id': eq.id,
                    'description': self.notes or self.env._('Equipment returned damaged from order %s', order.name),
                    'state': 'todo',
                })
        else:
            equipments.write({'state': 'available'})

        order.state = 'returned'

        # Log return note in chatter if present
        if self.notes:
            order.message_post(
                body=self.env._(
                    'Return processed. Damaged: %s. Notes: %s',
                    'Yes' if self.damaged else 'No',
                    self.notes,
                )
            )

        return {'type': 'ir.actions.act_window_close'}
