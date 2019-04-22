# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError, ValidationError


class StockMoveLineExt(models.Model):
    _inherit = "stock.move.line"

    description = fields.Text(
        'Product Description',
        translate=True,
    )

    lst_price = fields.Float(
        'Sales Price',
        digits=dp.get_precision('Product Price'),
        help="Price at which the product is sold to customers.",
    )

    standard_price = fields.Float(
        'Cost',
        digits=dp.get_precision('Product Price'),
        help=
        "Cost used for stock valuation in standard price and as a first price to set in average/FIFO."
    )

    profit_margin = fields.Float(
        compute="_compute_profit_margin",
        string='Profit Margin (%)',
        help="(Sale Price * 100 / Cost) - 100")

    total_cost_amount = fields.Float(
        compute="_compute_total_cost_amount",
        string='Cost Amount'
    )

    @api.depends('standard_price', 'qty_done')
    def _compute_total_cost_amount(self):
        for rec in self:
            rec.total_cost_amount = rec.standard_price * rec.qty_done

    @api.depends('lst_price', 'standard_price')
    def _compute_profit_margin(self):
        for rec in self:
            if rec.standard_price != 0 and rec.standard_price < rec.lst_price:
                rec.profit_margin = (
                    (rec.lst_price * 100) / rec.standard_price) - 100

    @api.onchange('product_id')
    def change_default_value(self):
        if self.product_id:
            self.lst_price = self.product_id.lst_price
            self.standard_price = self.product_id.standard_price
            self.description = self.product_id.description

    @api.model_create_multi
    def create(self, vals_list):
        res_id = super(StockMoveLineExt, self).create(vals_list)

        for vals in vals_list:

            if 'product_id' in vals and 'lst_price' not in vals:
                product = self.env['product.product'].browse(
                    vals['product_id'])

                if product.exists():
                    res_id.lst_price = product.lst_price
                    res_id.standard_price = product.standard_price
                    res_id.description = product.description

            if 'lst_price' in vals:
                self.product_id.write({'lst_price': vals.get('lst_price', 0)})
            if 'standard_price' in vals:
                self.product_id.write({
                    'standard_price':
                    vals.get('standard_price', 0)
                })
            if 'description' in vals:
                self.product_id.write({'description': vals.get('description')})

        return res_id

    def write(self, vals):
        res = super(StockMoveLineExt, self).write(vals)

        if 'lst_price' in vals:
            self.product_id.write({'lst_price': vals.get('lst_price', 0)})
        if 'standard_price' in vals:
            self.product_id.write({
                'standard_price':
                vals.get('standard_price', 0)
            })
        if 'description' in vals:
            self.product_id.write({'description': vals.get('description')})

        return res