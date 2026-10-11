{
    'name': 'Rental Core',
    'version': '20.0.1.0.0',
    'category': 'Services',
    'summary': 'Equipment rental and service management system',
    'description': """
Equipment Rental & Service System
=================================
Manage equipment catalog, categories, rental orders, customer returns, and maintenance.
    """,
    'author': 'Odoo Developer',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'mail',
    ],
    'data': [
        'security/rental_security.xml',
        'security/ir.access.csv',
        'data/rental_sequence_data.xml',
        'report/rental_report_views.xml',
        'data/rental_mail_data.xml',
        'data/rental_cron_data.xml',
        'wizard/rental_return_wizard_views.xml',
        'views/rental_category_views.xml',
        'views/rental_equipment_views.xml',
        'views/rental_order_views.xml',
        'views/rental_maintenance_views.xml',
        'views/rental_menus.xml',
    ],
    'application': True,
    'installable': True,
}
