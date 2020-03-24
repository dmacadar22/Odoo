# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'KPI Digests Custom',
    'category': 'Marketing',
    'description': """
Send KPI Digests periodically
=============================
""",
    'version': '1.0',
    'depends': [
        'digest', 'point_of_sale'
    ],
    'data': [
        'data/digest_template_data.xml',
        'data/digest_departments_data.xml',
        'data/digest_data.xml',
        'views/digest_views.xml'
    ],
}
