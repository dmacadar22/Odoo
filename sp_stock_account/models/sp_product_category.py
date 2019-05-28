# -*- coding: utf-8 -*-

from odoo import fields, models


class SpProductCategory(models.Model):
    _inherit = "product.category"

    scrap_account_id = fields.Many2one(
        'account.account',
        string="Scrap Account",
        help="This account will be used when products are moved to scrap "
             "location."
    )
