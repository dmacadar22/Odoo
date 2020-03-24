# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'SP Point of sale',
    'version': '12.0.1.0.0',
    'summary': 'SP Sales',
    'sequence': 16,
    'description': """
    """,
    'category': 'Point Of Sale',
    'website': '',
    'images': [],
    'depends': ['point_of_sale'],
    'data': [
        'views/sp_pos_order_view.xml',
    ],
    'demo': [],
    'installable': True,
    'application': True,
    'auto_install': False,
    'qweb': [],
}
