# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    stock_variation_account = fields.Many2one(
        comodel_name='account.account',
        related='company_id.stock_variation_account',
        string="Account for stock variation",
        readonly=False
    )
