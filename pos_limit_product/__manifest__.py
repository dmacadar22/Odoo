# -*- coding: utf-8 -*-
{
    'name': "Point of sale limit product",

    'summary': """
        Point of sale limit product""",

    'description': """
Point of sale limit product
---------------------------
Setting the product limit to show in point od sale.
    """,

    'author': "My Company",
    'website': "http://www.yourcompany.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/12.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'POS',
    'version': '1.0',

    # any module necessary for this one to work correctly
    'depends': ['point_of_sale'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        #'views/pos_config_view.xml',
        'views/point_of_sale.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
    ],
}