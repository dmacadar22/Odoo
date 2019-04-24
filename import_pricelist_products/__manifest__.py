# -*- coding: utf-8 -*-
{
    'name': "Import Product into Pricelist",
    'category': 'Tools',
    'version': '1.0',

    # any module necessary for this one to work correctly
    'depends': ['product'],

    # always loaded
    'data': [
        'security/security.xml',
        'wizard/import_products_wizard.xml', 
        'views/product_pricelist_view.xml'
    ],
}