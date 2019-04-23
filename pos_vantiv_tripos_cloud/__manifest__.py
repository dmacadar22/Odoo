# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Vantiv triPOS Cloud Payment Services',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence':  'Credit card support for Point Of Sale',
    'description':
    """
Allow credit card POS payments with triPOS Cloud
================================================

This module allows customers to pay for their orders with credit
cards. The transactions are processed by triPOS Cloud (developed by Company).
    """,
    'depends': ['web', 'barcodes', 'point_of_sale'],
    'data': [
        # Load Data
        'data/pos_vantiv_tripos_cloud_data.xml',
        # Load security
        'security/ir.model.access.csv',
        # Load Views
        'views/pos_vantiv_tripos_cloud_views.xml',
        'views/pos_vantiv_tripos_lane_views.xml',
        'views/pos_order_views.xml',
        # Load Menus
        'views/menus.xml',
        # Load js and css for POS
        'views/pos_vantiv_templates.xml',
    ],
    'demo': [
        # 'data/pos_vantiv_tripos_cloud_demo.xml',
    ],
    'qweb': [
        'static/src/xml/pos_vantiv_tripos_cloud.xml',
    ],
    'installable': True,
    'auto_install': False,
}
