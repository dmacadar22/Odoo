# -*- coding: utf-8 -*-
{
    'name': "stock_inventory_custom_account",

    'summary': """
        Custom Account Stock Inventory""",

    'description': """
        Custom account for entries generated in stock inventory adjustment.
    """,

    'author': "",
    'website': "",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/12.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Warehouse',
    'version': '1.0',

    # any module necessary for this one to work correctly
    'depends': ['stock_account'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/res_config_settings_views.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
    ],
}