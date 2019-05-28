# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'SP Stock',
    'version': '12.0.1.0.0',
    'summary': 'SP Stock',
    'sequence': 16,
    'description': """
    """,
    'category': 'Warehouse',
    'website': '',
    'images': [],
    'depends': ['stock'],
    'data': [
        'views/sp_stock_picking_view.xml',
        'views/sp_stock_product_view.xml',
    ],
    'demo': [],
    'installable': True,
    'application': True,
    'auto_install': False,
    'qweb': [],
}
