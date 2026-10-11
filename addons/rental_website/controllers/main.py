from datetime import date, timedelta
from odoo import http, fields, _
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class RentalPortalController(CustomerPortal):

    def _prepare_home_portal_values(self, counters):
        values = super()._prepare_home_portal_values(counters)
        if 'rental_count' in counters:
            partner = request.env.user.partner_id
            values['rental_count'] = request.env['rental.order'].sudo().search_count([
                ('customer_id', '=', partner.id)
            ])
        return values

    @http.route(['/my/rentals', '/my/rentals/page/<int:page>'], type='http', auth='user', website=True)
    def portal_my_rentals(self, **kwargs):
        partner = request.env.user.partner_id
        orders = request.env['rental.order'].sudo().search([
            ('customer_id', '=', partner.id)
        ], order='id desc')
        return request.render('rental_website.portal_my_rentals', {
            'orders': orders,
            'page_name': 'rental',
        })

    @http.route(['/my/rentals/<int:order_id>/contract'], type='http', auth='user', website=True)
    def portal_my_rental_contract(self, order_id, **kwargs):
        partner = request.env.user.partner_id
        order = request.env['rental.order'].sudo().search([
            ('id', '=', order_id),
            ('customer_id', '=', partner.id),
        ], limit=1)
        if not order:
            return request.not_found()
        report = request.env.ref('rental_core.action_report_rental_contract')
        pdf_content, _ = report.sudo()._render_qweb_pdf(report.report_name, [order.id])
        headers = [
            ('Content-Type', 'application/pdf'),
            ('Content-Length', len(pdf_content)),
            ('Content-Disposition', f'attachment; filename="Rental_Contract_{order.name}.pdf"'),
        ]
        return request.make_response(pdf_content, headers=headers)

    # ---------------------------------------------------------
    # Public Routes
    # ---------------------------------------------------------
    @http.route(['/rental'], type='http', auth='public', website=True)
    def rental_catalog(self, category_id=None, **kwargs):
        domain = [('state', '=', 'available')]
        if category_id:
            domain.append(('category_id', '=', int(category_id)))
        equipments = request.env['rental.equipment'].sudo().search(domain, order='name')
        categories = request.env['rental.category'].sudo().search([], order='name')
        return request.render('rental_website.rental_catalog_page', {
            'equipments': equipments,
            'categories': categories,
            'current_category': int(category_id) if category_id else None,
        })

    @http.route(['/rental/book'], type='http', auth='public', methods=['GET', 'POST'], website=True, csrf=False)
    def rental_book(self, **post):
        if request.httprequest.method == 'POST':
            name = post.get('name')
            email = post.get('email')
            phone = post.get('phone')
            equipment_id = int(post.get('equipment_id', 0) or 0)
            date_start = post.get('date_start')
            date_end = post.get('date_end')

            if not (name and email and equipment_id and date_start and date_end):
                equipments = request.env['rental.equipment'].sudo().search([('state', '=', 'available')])
                return request.render('rental_website.rental_book_page', {
                    'equipments': equipments,
                    'error': _('Please fill in all required fields.'),
                    'post': post,
                })

            Partner = request.env['res.partner'].sudo()
            partner = Partner.search([('email', '=ilike', email.strip())], limit=1)
            if not partner:
                partner = Partner.create({
                    'name': name.strip(),
                    'email': email.strip(),
                    'phone': phone.strip() if phone else False,
                })

            equipment = request.env['rental.equipment'].sudo().browse(equipment_id)
            order = request.env['rental.order'].sudo().create({
                'customer_id': partner.id,
                'date_start': date_start,
                'date_end': date_end,
                'line_ids': [(0, 0, {
                    'equipment_id': equipment.id,
                    'daily_price': equipment.daily_price,
                })],
            })

            return request.render('rental_website.rental_book_confirmation', {
                'order': order,
                'equipment': equipment,
            })

        # GET request
        preselected_id = int(post.get('equipment_id', 0) or 0)
        equipments = request.env['rental.equipment'].sudo().search([('state', '=', 'available')])
        today = fields.Date.context_today(request.env['rental.order'])
        default_end = today + timedelta(days=3)
        return request.render('rental_website.rental_book_page', {
            'equipments': equipments,
            'preselected_id': preselected_id,
            'default_start': str(today),
            'default_end': str(default_end),
            'post': {},
        })
