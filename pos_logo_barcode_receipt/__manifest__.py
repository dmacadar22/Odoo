# -*- coding: utf-8 -*-
# See LICENSE file for full copyright and licensing details.
{
    'name': 'POS Logo Barcode Receipt',
    'version': '12.0.1.0.0',
    'license': 'LGPL-3',
    'author': 'Serpent Consulting Services Pvt. Ltd.',
    'maintainer': 'Serpent Consulting Services Pvt. Ltd.',
    'website': 'http://www.serpentcs.com',
    'category': 'Point Of Sale',
    'description': """pos order report with barcode
    pos receipt with barcode
    pos barcode receipt
    pos report customization
    pos scan barcode receipt
    pos order barcode
    point of sale barcode report
    order barcode report
    report barcode
    """,
    'summary': """pos order report with barcode
    pos receipt with barcode
    pos barcode receipt
    pos report customization
    pos scan barcode receipt
    pos order barcode
    point of sale barcode report
    order barcode report
    report barcode
    """,
    'depends': ['point_of_sale'],
    'data': [
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/pos_logo_barcode_receipt.xml'],
    'images': ['static/description/pos_logo_barcode.png'],
    'installable': True,
    'auto_install': False,
    'application': False,
    'price': 19,
    'currency': 'EUR',
}
