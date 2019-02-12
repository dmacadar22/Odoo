# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _


class Company(models.Model):
    _inherit = "res.company"

    stock_variation_account = fields.Many2one(
        comodel_name='account.account',
        string="Account for stock variation",
    )
