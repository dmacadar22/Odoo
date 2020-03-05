# -*- coding: utf-8 -*-
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################
{
    'name': "Product return from POS",
    'version': '1.1',
    'category': 'Point of Sale',
    'description': """
This module is used to return the products to the customer from POS Interface.
""",
    'summary': 'Return products from Point of sale Interface.',
    'author': 'Acespritech Solutions Pvt. Ltd.',
    'website': "http://www.acespritech.com",
    'currency': 'EUR',
    'price': 49,
    'depends': ['web', 'point_of_sale', 'base'],
    'data': [
        'views/pos_return.xml',
        'views/point_of_sale_view.xml'
    ],
    'qweb': ['static/src/xml/pos_return.xml'],
    'images': ['static/description/main_screenshot.png'],
    "installable": True,
    'auto_install': False,
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4: