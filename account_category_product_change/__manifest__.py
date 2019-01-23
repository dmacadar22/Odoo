# -*- coding: utf-8 -*-
{
    'name': "account_category_product_change",

    'summary': """
        Account Category Product Change""",

    'description': """
        Cuando se cambian algunas de las cuentas de las categorias, se 
        cambian las cuentas de los productos de esta categoría que no tenga
        dicha cuenta definida.
    """,

    'author': "",
    'website': "http://www.yourcompany.com",
    'category': 'Accounting',
    'version': '12.0.1.0',

    # any module necessary for this one to work correctly
    'depends': ['account'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/product_category_views.xml',
        # 'views/templates.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
    ],
}
