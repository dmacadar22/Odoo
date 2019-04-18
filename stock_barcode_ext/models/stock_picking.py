# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError, ValidationError


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    # @api.model
    # def create(self, vals):
    #     res = super(StockPicking, self).create(vals)
    #     print('vals', vals)

    #     if vals.get('move_ids_without_package'):
    #         for move in vals['move_ids_without_package']:
    #             product_id = self.env['product.product'].browse(
    #                 move[2].get('product_id'))
    #             move[2][]
    #             print('move ', move)
    #             # if len(move) == 3 and move[0] == 0:
    #             #     move[2]['location_id'] = vals['location_id']
    #             #     move[2]['location_dest_id'] = vals['location_dest_id']
    #     return res