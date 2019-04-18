# -*- coding: utf-8 -*-

{
    'name': "Barcode Ext",
    'summary': "Use barcode scanners to process logistics operations",
    'description': """
        This module adds support for barcodes scanning to the warehouse management system.
    """,
    'category': 'Warehouse',
    'version': '1.0',
    'depends': ['stock_barcode', 'product_margin'],
    'data': [
        'views/stock_move_line_views.xml',
        'views/stock_barcode_templates.xml'
    ],
    
}
