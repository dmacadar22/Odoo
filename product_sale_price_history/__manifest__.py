# -*- coding: utf-8 -*-
##############################################################################
#
#    Globalteckz Pvt Ltd
#    Copyright (C) 2013-Today(www.globalteckz.com).
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################
{
    'name' : 'Product Sale Price History',
    'version' : '1.0',
    'category' : 'Extra Tools',
    'description' : """
product sale price
product sales price 
product sale price history
product sales price history
price history
prices history
sale price history
sales price history
sale history
sales history
history of sale
history of sales
history of product sales
history of product sale
history of product
Product history
product history
product price
product


""",
    "summary":"Product sales history will help you track of sales price for each product on each sales order",
    'website': 'https://www.globalteckz.com',
	'author' : 'Globalteckz',
    "price": "20.00",
    "currency": "EUR",
    'license': 'Other proprietary',
    'images': ['static/description/Banner.jpg'],
    'depends' : ['base', 'product', 'sale', 'sale_management'],
    'data': [
        'security/ir.model.access.csv',
        'views/product_sale_price_history.xml',
        'views/res_config.xml',
    ],
    'qweb' : [
    ],
    'test': [
    ],
    'installable': True,
    'auto_install': False,
}
