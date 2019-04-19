# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError, ValidationError


class Product(models.Model):
    _inherit = "product.product"

    profit_margin = fields.Float(
        compute="_compute_profit_margin",
        string='Profit Margin (%)',
        help="(Sale Price * 100 / Cost) - 100")

    @api.depends('lst_price', 'standard_price')
    def _compute_profit_margin(self):
        for rec in self:
            if rec.standard_price != 0 and rec.standard_price < rec.lst_price:
                rec.profit_margin = (
                    (rec.lst_price * 100) / rec.standard_price) - 100
