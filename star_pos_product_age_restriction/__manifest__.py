# -*- coding: utf-8 -*-
# Part of The Stella IT Solutions. See LICENSE file for full copyright and licensing details.

{
    'name': 'POS Age Restriction On Product',
    'version': '12.0.1.0.0',
    'author': 'The Stella IT Solutions',
    'website': 'http://www.thestellait.com',
    'category': 'Point of Sale',
    'summary': 'With the use of this addon, the seller can restrict the sell of products to under age.',
    'description': '''
POS Age Restriction on Product
Product Age
Required age to buy product
Adult products
POS Products
18+ products
POS customization
POS Expert
''',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'data/pos_demo_data.xml',
        'views/assets.xml',
        'views/product_template_view.xml',
        'views/res_config_settings_view.xml',
    ],
    'images': [
        'static/description/splash-screen.png',
    ],
    'qweb': ['static/src/xml/star_pos_product_age_restriction.xml'],
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'OPL-1',
    'price': 29.00,
    'currency': 'EUR',
}
