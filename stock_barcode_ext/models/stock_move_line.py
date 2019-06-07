# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError, ValidationError


class StockMoveLineExt(models.Model):
    _inherit = "stock.move.line"

    amount_total = fields.Float(related="picking_id.amount_total", string="Invoice Total",
                                digits=(16, 2), )

    description = fields.Text(
        'Product Description',
        related="product_id.description",
        translate=True,
    )

    price_subtotal = fields.Float(
        string="Invoice Line Total", store=True, digits=(16, 2),
    )

    list_price = fields.Float(
        'Sales Price',
        # related="product_id.list_price",
        digits=(16, 2),
        help="Price at which the product is sold to customers.",
        # store=True
    )

    standard_price = fields.Float(
        # related="product_id.standard_price",
        # compute="_compute_standard_price",
        string='Cost',
        digits=(16, 2),
        help="Cost used for stock valuation in standard price and as a first price to set in average/FIFO.",
        default=lambda self: self.product_id.standard_price
        # store=True
    )

    profit_margin = fields.Float(
        compute="_compute_profit_margin",
        string='Profit Margin (%)',
        help="(Sale Price * 100 / Cost) - 100", digits=(16, 2), )

    @api.model
    def calculate_cost(self, vals):
        if 'price_subtotal' in vals and 'id' in vals:
            vid = vals.get('id')
            if type(vid) != str:
                move_line = self.search([('id', '=', vid)])
                price = float(vals.get('price_subtotal'))
                cost = move_line.standard_price
                if move_line.qty_done != 0.0:
                    cost = round(price / move_line.qty_done, 2)
                move_line.with_context({'price': True}).write({'price_subtotal': price, 'standard_price': cost})

    @api.onchange('price_subtotal')
    def _onchange_calculate_cost(self):
        for rec in self:
            if rec.qty_done != 0.0:
                rec.standard_price = round(rec.price_subtotal / rec.qty_done, 2)

    @api.onchange('qty_done')
    def _onchange_calculate_price(self):
        for rec in self:
            if rec.qty_done != 0.0:
                rec.price_subtotal = round(rec.standard_price * rec.qty_done, 2)

    # def get_default_cost(self):
    #     return self.product_id.standard_price

    # @api.depends('price_subtotal')
    # def _compute_standard_price(self):
    #     print('conte 2', self._context)
    #     for rec in self:
    #         if rec.qty_done != 0.0:
    #             rec.standard_price = rec.price_subtotal / rec.qty_done

    @api.depends('list_price', 'standard_price')
    def _compute_profit_margin(self):
        for rec in self:
            if rec.list_price != 0:
                rec.profit_margin = round(((rec.list_price - rec.standard_price) / rec.list_price) * 100, 2)

    @api.onchange('product_id')
    def change_default_value(self):
        if self.product_id:
            self.list_price = self.product_id.list_price
            self.standard_price = self.product_id.standard_price
            self.description = self.product_id.description
            self.price_subtotal = self.standard_price * self.qty_done

    @api.model_create_multi
    def create(self, vals_list):
        product = None
        if len(vals_list) and vals_list[0].get('product_id', False):
            product_id = vals_list[0].get('product_id', False)
            product = self.env['product.product'].browse(product_id)
            qty = vals_list[0].get('qty_done', 0)
            standard_price = product.standard_price
            list_price = product.list_price
            price_subtotal = qty * standard_price
            if vals_list[0].get('price_subtotal', False):
                price_subtotal = vals_list[0]['price_subtotal']

            vals_list[0].update(
                {'price_subtotal': price_subtotal, 'list_price': list_price, 'standard_price': standard_price})

        res_id = super(StockMoveLineExt, self).create(vals_list)

        if product.exists():
            for vals in vals_list:
                if 'list_price' in vals:
                    product.write({'list_price': vals.get('list_price', 0)})

                # if 'qty_done' in vals:
                #     if vals.get('qty_done', 0) != 0.0 and vals.get('price_subtotal', 0) != 0:
                #         product.write({
                #             'standard_price': vals.get('price_subtotal') / vals.get('qty_done')
                #         })

                if 'price_subtotal' in vals:
                    if vals.get('qty_done', 0) != 0.0 and vals.get('price_subtotal', 0) != 0:
                        product.write({
                            'standard_price': vals.get('price_subtotal', 0) / vals.get('qty_done')
                        })

                if 'description' in vals:
                    product.write({'description': vals.get('description')})

        return res_id

    @api.model
    def write_rpc(self, vals):
        if 'id' in vals:
            vid = vals.get('id')
            if type(vid) != str:
                move_line = self.search([('id', '=', vid)])
                if move_line.exists():
                    values = {}
                    if 'price_subtotal' in vals:
                        values['price_subtotal'] = vals.get('price_subtotal')
                    if 'qty_done' in vals:
                        values['qty_done'] = vals.get('qty_done')
                    if 'list_price' in vals:
                        values['list_price'] = vals.get('list_price')

                    if values:
                        return move_line.write(values)
                    return False
        return False

    @api.multi
    def write(self, vals):
        res = super(StockMoveLineExt, self).write(vals)
        for record in self:
            # if 'product_id' in vals:
            #     if record.qty_done:
            #         record.product_id.write({
            #             'standard_price': record.price_subtotal / record.qty_done
            #         })

            if 'list_price' in vals:
                record.product_id.write({'list_price': vals.get('list_price')})

            # if 'standard_price' in vals:
            #     record.price_subtotal = record.qty_done * record.standard_price

            if 'qty_done' in vals:
                if record.qty_done != 0.0:
                    record.price_subtotal = round(record.standard_price * record.qty_done, 2)
                    # record.product_id.write({
                    #     'standard_price': record.standard_price
                    # })

            # if 'price_subtotal' in vals:
            #     if record.qty_done != 0.0 and record.price_subtotal != 0.0:
            #         record.standard_price = record.price_subtotal / record.qty_done
            #         record.product_id.write({
            #             'standard_price': record.standard_price
            #         })

            if 'description' in vals:
                record.product_id.write({'description': vals.get('description')})

        return res
