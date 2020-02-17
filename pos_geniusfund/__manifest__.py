# -*- coding: utf-8 -*-

{
    'name': 'Pos GeniusFund',
    'version': '1.1',
    'category': 'Point of Sale',
    'sequence': 1,
    'author': 'Captivea',
    'summary': 'Find here all the adaptations of the POS for GeniusFund, design, functionalities, etc.',
    'description': """
=======================
Pos Customer Limitation
""",
    'depends': ['web', 'point_of_sale', 'point_of_sale_logo'],
    'demo': [],
    'data': ['views/genius_pos.xml',
             'views/pos_templates.xml',
             'views/pos_config_view.xml',
             'views/res_users_view.xml',
             'views/budtender_view.xml'
             ],
    'images': [],
    'qweb': [
        'static/src/xml/pos_genius.xml',
        'static/src/xml/budtender_start_screen.xml',
    ],
    'active': False,
    'installable': True,
    'application': False,
}
