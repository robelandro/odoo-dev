{
    'name': 'Rental Sale & Invoicing',
    'version': '20.0.1.0.0',
    'category': 'Sales/Services',
    'summary': 'Invoicing and Sale integration for Equipment Rentals',
    'description': """
Rental Sale & Invoicing Integration
===================================
Automatically create Sales Orders and Customer Invoices for completed equipment rentals.
    """,
    'author': 'Odoo Developer',
    'license': 'LGPL-3',
    'depends': [
        'rental_core',
        'sale',
    ],
    'data': [
        'views/rental_order_views.xml',
    ],
    'application': False,
    'installable': True,
    'auto_install': False,
}
