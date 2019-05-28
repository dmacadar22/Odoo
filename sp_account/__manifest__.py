# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'SP Account',
    'version': '12.0.1.0.0',
    'summary': 'SP Account',
    'sequence': 16,
    'description': """
    """,
    'category': 'Invoicing Management',
    'website': '',
    'images': [],
    'depends': ['account'],
    'data': [
        'views/sp_account_invoice_view.xml',
        'views/sp_account_move_view.xml',
    ],
    'demo': [],
    'installable': True,
    'application': True,
    'auto_install': False,
    'qweb': [],
}
