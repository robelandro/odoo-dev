{
    'name': 'Rental Website & Portal',
    'version': '20.0.1.0.0',
    'category': 'Website/Services',
    'summary': 'Public Equipment Catalog, Online Booking & Customer Rental Portal',
    'description': """
Equipment Rental Website & Customer Portal
===========================================
- Public catalog page (/rental)
- Online booking request form (/rental/book)
- Customer portal rentals view & PDF contract download (/my/rentals)
    """,
    'author': 'Odoo Developer',
    'license': 'LGPL-3',
    'depends': [
        'rental_core',
        'portal',
    ],
    'data': [
        'views/portal_templates.xml',
        'views/website_rental_templates.xml',
    ],
    'application': False,
    'installable': True,
    'auto_install': False,
}
