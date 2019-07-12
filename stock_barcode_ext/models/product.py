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
    
    @api.model
    def get_all_products_by_barcode(self):
        products = self.env['product.product'].search_read(
            [('barcode', '!=', None), ('type', '!=', 'service')],
            ['barcode', 'display_name', 'uom_id', 'tracking', 'standard_price', 'list_price']
        )
        packagings = self.env['product.packaging'].search_read(
            [('barcode', '!=', None), ('product_id', '!=', None)],
            ['barcode', 'product_id', 'qty']
        )
        # for each packaging, grab the corresponding product data
        to_add = []
        to_read = []
        products_by_id = {product['id']: product for product in products}
        for packaging in packagings:
            if products_by_id.get(packaging['product_id']):
                product = products_by_id[packaging['product_id']]
                to_add.append(dict(product, **{'qty': packaging['qty']}))
            # if the product doesn't have a barcode, you need to read it directly in the DB
            to_read.append((packaging, packaging['product_id'][0]))
        products_to_read = self.env['product.product'].browse(list(set(t[1] for t in to_read))).sudo().read(['display_name', 'uom_id', 'tracking', 'standard_price', 'lst_price'])
        products_to_read = {product['id']: product for product in products_to_read}
        to_add.extend([dict(t[0], **products_to_read[t[1]]) for t in to_read])
        return {product.pop('barcode'): product for product in products + to_add}
