from odoo import http, fields, _
from odoo.http import request


class RentalApiController(http.Controller):

    @http.route('/api/rental/equipment', type='jsonrpc', auth='public', methods=['POST'], cors='*')
    def api_rental_equipment(self, category_id=None, **kwargs):
        domain = []
        if category_id:
            domain.append(('category_id', '=', int(category_id)))
        equipments = request.env['rental.equipment'].sudo().search(domain, order='name')
        data = []
        for eq in equipments:
            data.append({
                'id': eq.id,
                'name': eq.name,
                'code': eq.code,
                'category_id': eq.category_id.id if eq.category_id else None,
                'category_name': eq.category_id.name if eq.category_id else None,
                'daily_price': eq.daily_price,
                'currency': eq.currency_id.name if eq.currency_id else 'USD',
                'state': eq.state,
                'notes': eq.notes or '',
                'image_url': f'/web/image/rental.equipment/{eq.id}/image' if eq.image else None,
            })
        return {
            'status': 'success',
            'count': len(data),
            'equipment': data,
        }

    @http.route('/api/rental/check_availability', type='jsonrpc', auth='public', methods=['POST'], cors='*')
    def api_check_availability(self, equipment_id=None, date_start=None, date_end=None, **kwargs):
        if not (equipment_id and date_start and date_end):
            return {
                'available': False,
                'error': _('equipment_id, date_start, and date_end are required.'),
            }

        equipment = request.env['rental.equipment'].sudo().browse(int(equipment_id))
        if not equipment.exists():
            return {
                'available': False,
                'error': _('Equipment not found.'),
            }

        if equipment.state == 'maintenance':
            return {
                'available': False,
                'equipment_id': equipment.id,
                'reason': _('Equipment is currently undergoing maintenance.'),
            }

        # Check overlapping active orders
        overlapping_orders = request.env['rental.order'].sudo().search([
            ('state', 'in', ['confirmed', 'rented', 'overdue']),
            ('line_ids.equipment_id', '=', equipment.id),
            ('date_start', '<=', date_end),
            ('date_end', '>=', date_start),
        ])

        if overlapping_orders:
            return {
                'available': False,
                'equipment_id': equipment.id,
                'date_start': date_start,
                'date_end': date_end,
                'conflicting_orders': overlapping_orders.mapped('name'),
                'reason': _('Equipment is already booked for these dates.'),
            }

        return {
            'available': True,
            'equipment_id': equipment.id,
            'equipment_name': equipment.name,
            'daily_price': equipment.daily_price,
            'date_start': date_start,
            'date_end': date_end,
        }

    @http.route('/api/rental/book', type='jsonrpc', auth='public', methods=['POST'], cors='*')
    def api_book_rental(self, name=None, email=None, phone=None, equipment_id=None, date_start=None, date_end=None, **kwargs):
        if not (name and email and equipment_id and date_start and date_end):
            return {
                'success': False,
                'error': _('Missing required booking fields (name, email, equipment_id, date_start, date_end).'),
            }

        # Check availability first
        availability = self.api_check_availability(
            equipment_id=equipment_id,
            date_start=date_start,
            date_end=date_end,
        )
        if not availability.get('available'):
            return {
                'success': False,
                'error': availability.get('reason') or availability.get('error'),
            }

        # Find or create partner
        Partner = request.env['res.partner'].sudo()
        partner = Partner.search([('email', '=ilike', email.strip())], limit=1)
        if not partner:
            partner = Partner.create({
                'name': name.strip(),
                'email': email.strip(),
                'phone': phone.strip() if phone else False,
            })

        equipment = request.env['rental.equipment'].sudo().browse(int(equipment_id))
        order = request.env['rental.order'].sudo().create({
            'customer_id': partner.id,
            'date_start': date_start,
            'date_end': date_end,
            'line_ids': [(0, 0, {
                'equipment_id': equipment.id,
                'daily_price': equipment.daily_price,
            })],
        })

        return {
            'success': True,
            'order_id': order.id,
            'order_name': order.name,
            'total': order.total,
            'currency': order.currency_id.name,
            'days': order.days,
            'state': order.state,
            'customer_name': partner.name,
            'equipment_name': equipment.name,
        }
