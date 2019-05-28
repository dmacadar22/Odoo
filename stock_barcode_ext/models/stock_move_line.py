# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError, ValidationError


class StockMoveLineExt(models.Model):
    _inherit = "stock.move.line"

    amount_total = fields.Float(related="picking_id.amount_total", string="Invoice Total",
                                digits=dp.get_precision('Product Price'), )

    description = fields.Text(
        'Product Description',
        related="product_id.description",
        translate=True,
    )

    price_subtotal = fields.Float(
        string="Invoice Line Total", store=True, digits=dp.get_precision('Product Price')
    )

    list_price = fields.Float(
        'Sales Price', related="product_id.list_price",
        digits=dp.get_precision('Product Price'),
        help="Price at which the product is sold to customers.",
        # store=True
    )

    standard_price = fields.Float(
        related="product_id.standard_price",
        string='Cost',
        digits=dp.get_precision('Product Price'),
        help="Cost used for stock valuation in standard price and as a first price to set in average/FIFO.",
        # store=True
    )

    profit_margin = fields.Float(
        compute="_compute_profit_margin",
        string='Profit Margin (%)',
        help="(Sale Price * 100 / Cost) - 100", digits=dp.get_precision('Product Price'), )

    @api.onchange('qty_done', 'price_subtotal')
    def _onchange_calculate_cost(self):
        for rec in self:
            print('done', type(rec.qty_done), rec.qty_done)
            if rec.qty_done != 0.0:
                rec.standard_price = rec.price_subtotal / rec.qty_done

    @api.depends('list_price', 'standard_price')
    def _compute_profit_margin(self):
        for rec in self:
            if rec.list_price != 0:
                rec.profit_margin = ((rec.list_price - rec.standard_price) / rec.list_price) * 100

    @api.onchange('product_id')
    def change_default_value(self):
        if self.product_id:
            self.list_price = self.product_id.list_price
            self.standard_price = self.product_id.standard_price
            self.description = self.product_id.description

    @api.model_create_multi
    def create(self, vals_list):
        res_id = super(StockMoveLineExt, self).create(vals_list)

        for vals in vals_list:

            if 'product_id' in vals and 'list_price' not in vals:
                product = self.env['product.product'].browse(
                    vals['product_id'])

                if product.exists():
                    res_id.list_price = product.list_price
                    res_id.standard_price = product.standard_price
                    res_id.description = product.description

            if 'list_price' in vals:
                self.product_id.write({'list_price': vals.get('list_price', 0)})
            if 'standard_price' in vals:
                self.product_id.write({
                    'standard_price':
                        vals.get('standard_price', 0)
                })
            if 'description' in vals:
                self.product_id.write({'description': vals.get('description')})

        return res_id

    @api.model
    def write_rpc(self, vals):
        print('values ', vals)
        if 'id' in vals:
            vid = vals.get('id')
            if type(vid) != str:
                move_line = self.search([('id', '=', vid)])
                if move_line.exists():
                    values = {}
                    if 'price_subtotal' in vals:
                        values['price_subtotal'] = vals.get('price_subtotal', 0.0)
                    if 'qty_done' in vals:
                        values['qty_done'] = vals.get('qty_done', 0.0)
                    if 'list_price' in vals:
                        values['list_price'] = vals.get('list_price', 0.0)

                    if values:
                        return move_line.write(values)
                    return False
        return False

    @api.multi
    def write(self, vals):
        res = super(StockMoveLineExt, self).write(vals)
        print('res ', res)
        print('product ', self.product_id)
        print('product ', self.price_subtotal, self.qty_done)
        print('values ', vals)

        if 'product_id' in vals:
            if self.qty_done:
                self.product_id.write({
                    'standard_price': self.price_subtotal / self.qty_done
                })

        if 'list_price' in vals:
            self.product_id.write({'list_price': vals.get('list_price', 0)})

        if 'qty_done' in vals:
            if self.qty_done != 0.0:
                self.product_id.write({
                    'standard_price': self.price_subtotal / self.qty_done
                })

        if 'price_subtotal' in vals:
            if self.qty_done != 0.0:
                self.product_id.write({
                    'standard_price': self.price_subtotal / self.qty_done
                })

        if 'description' in vals:
            self.product_id.write({'description': vals.get('description')})

        return res
