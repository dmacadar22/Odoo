# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.
{
    'name':'Product Purchase/Cost Price History',
    'version':'12.0.0.3',
    'author':'BrowseInfo',
    'website':'http://www.browseinfo.in',
    'images':[],
    'price': 15.00,
    'currency': "EUR",
    'summary': 'This module generates the cost price history of product based purchase orders.',
    'description': """ 
    odoo Product Cost price history product History of product Purchase price history product odoo
    odoo Change price history change product history change cost price history product history purchase product cost revision odoo
    odoo revision product price revision generate history on product Cost price history on product purchase price history on product
    odoo product costing history product purchase history product purchase history product price history product sales history
    odoo purchase cost price history for product vendor price history vendor product price history product vendor history
    odoo vendor bill price history vendor bill cost history vendor bill cost price history vendor

    odoo Products Cost price history products History of products Purchase price history products odoo
    odoo Change price history change products history change cost price history products history purchase products cost revision odoo
    odoo revision products price revision generate history on products Cost price history on products purchase price history on products
    odoo products costing history products purchase history products purchase history products price history products sales history

    odoo Product Variant Cost price history product Variant History of product Variant Purchase price history product Variant odoo
    odoo Change price history change product Variant history change cost price history product Variant history purchase product Variant cost revision odoo
    odoo revision product Variant price revision generate history on product Variant Cost price history on product Variant purchase price history on product Variant
    odoo product Variant costing history product Variant purchase history product Variant purchase history product Variant price history product Variant sales history Variant

For any purchase team and purchase manager to know price history of product, 
Which helps marketing team set up target and understand sales and purchase cycle for various product. 
This Odoo apps gives full details for product price history which is really helpful for purchase and accounting users. 
Whenever product is purchase from the purchase order or from the vendor bills it will generate price history as purchase price history and vendor bill price history on product level separately with vendor/supplier name. 
This odoo module helps whenever purchase user/billing user going to purchase product they can easily find best suitable vendor/supplier for that product.

    """,
    'data': ['security/ir.model.access.csv',
              'product_price_history_view.xml',
            ],
    'depends':['product', 'account', 'purchase', 'sale_management'],
    'demo': [],
    'test': [],
    'installable': True,
    'auto_install': False,
    "live_test_url":'https://youtu.be/RUY9_Snpt1o',
    "images":['static/description/banner.png'],

}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
