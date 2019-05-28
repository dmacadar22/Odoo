# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'SP Stock Account',
    'version': '12.0.1.0.0',
    'summary': 'SP Stock Account',
    'sequence': 16,
    'description': """
    """,
    'category': 'Invoicing Management',
    'website': '',
    'images': [],
    'depends': [
        'stock_account'
    ],
    'data': [
        'views/sp_product_category_view.xml',
    ],
    'demo': [],
    'installable': True,
    'application': False,
    'auto_install': False,
    'qweb': [],
}
