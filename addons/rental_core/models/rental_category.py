from odoo import fields, models


class RentalCategory(models.Model):
    _name = 'rental.category'
    _description = 'Rental Category'
    _order = 'name'

    name = fields.Char(string='Category Name', required=True)
