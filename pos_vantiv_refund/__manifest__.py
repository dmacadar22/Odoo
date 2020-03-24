# -*- coding: utf-8 -*-
{
    'name': 'Vantiv Refund In POS',
    'version': '1.1',
    'category': 'Point of Sale',
    'summary': 'POS Order Refund',
    'depends': ['point_of_sale', 'pos_vantiv_tripos_cloud'],
    'data': [
        'security/ir.model.access.csv',
        'views/return.xml',
        'views/pos_template.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
    'license': 'AGPL-3',
    'installable': True,
    'auto_install': False,
    'application': False,

}
