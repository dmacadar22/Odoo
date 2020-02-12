# -*- coding: utf-8 -*-
{
    'name': "Product History Tracking",

    'summary': """
        Provides Sales Price and Cost history tracking.""",

    'description': """
        Creates a new table called Product History Tracking which will contain entries for each change to the Product Sales Price or Cost, showing the time of the change, and the user responsible.
    """,

    'author': "Captivea",
    'website': "http://www.captivea.us",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/12.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.6',

    # any module necessary for this one to work correctly
    'depends': ['product'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
        'data/product_history_tracking.xml',
    ],
}