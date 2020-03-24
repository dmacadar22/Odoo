# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'SP Credit Note Purchase',
    'version': '1.0',
    'summary': 'Supplier Credit Note Purchase',
    'sequence': 15,
    'description': """
Credit note from purchase order
    """,
    'category': 'Invoicing Management',
    'website': '',
    'depends': [
        'account'
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/inherit_account_invoice_view.xml',

    ],
    'demo': [
    ],
    'qweb': [
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
