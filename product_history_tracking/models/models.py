# -*- coding: utf-8 -*-

from odoo import api, fields, models, tools, _
from odoo.exceptions import UserError
from odoo.tools import float_is_zero, pycompat
from odoo.addons import decimal_precision as dp

import logging

_logger = logging.getLogger('product')

class ProductTemplate(models.Model):
    _inherit = 'product.template'
    
    previous_list_price = fields.Float(string="Previous Sales Price", digits=dp.get_precision('Product Price'))

    product_history = fields.One2many(
        string="Product History",
        comodel_name="product.history.tracking",
        inverse_name="product",
        help="Product History",
    )

class ProductHistoryTracking(models.Model):
    _name = 'product.history.tracking'
    _description = 'Product History Tracking'
    list_price = fields.Float(string="New Sales Price", digits=dp.get_precision('Product Price'))
    previous_list_price = fields.Float(string="Previous Sales Price", digits=dp.get_precision('Product Price'))
    standard_price = fields.Float(string="New Cost", digits=dp.get_precision('Product Price'))
    previous_standard_price = fields.Float(string="Previous Cost", digits=dp.get_precision('Product Price'))
    modified_datetime = fields.Datetime(string="Modified Date & Time", )
    product = fields.Many2one(
        string="Product",
        comodel_name="product.template",
        domain="[]",
        context={},
        ondelete="set null",
        help="Related Product Template",
    )
    user = fields.Many2one(
        string="User",
        comodel_name="res.users",
        domain="[]",
        context={},
        ondelete="set null",
        help="Related User",
    )


class ProductMod(models.Model):
    _inherit = 'product.product'

    # # previous_list_price = fields.Float(
    # #     'Previous Sales Price', compute='_compute_stock_value')
    # product_history = fields.One2many(
    #     string="Product History",
    #     comodel_name="res.partner",
    #     related="product_tmpl_id.x_product_history",
    #     help="Product History",
    #     #inverse_name="inverse_name_id",
    #     #domain="[]",
    #     #context={},
    # )

    @api.multi
    def do_change_standard_price(self, new_price, account_id):
        """ Changes the Standard Price of Product and creates an account move accordingly."""
        AccountMove = self.env['account.move']

        quant_locs = self.env['stock.quant'].sudo().read_group([('product_id', 'in', self.ids)], ['location_id'], ['location_id'])
        quant_loc_ids = [loc['location_id'][0] for loc in quant_locs]
        locations = self.env['stock.location'].search([('usage', '=', 'internal'), ('company_id', '=', self.env.user.company_id.id), ('id', 'in', quant_loc_ids)])

        product_accounts = {product.id: product.product_tmpl_id.get_product_accounts() for product in self}

        for location in locations:
            for product in self.with_context(location=location.id, compute_child=False).filtered(lambda r: r.valuation == 'real_time'):
                diff = product.standard_price - new_price
                if float_is_zero(diff, precision_rounding=product.currency_id.rounding):
                    raise UserError(_("No difference between the standard price and the new price."))
                if not product_accounts[product.id].get('stock_valuation', False):
                    raise UserError(_('You don\'t have any stock valuation account defined on your product category. You must define one before processing this operation.'))
                qty_available = product.qty_available
                if qty_available:
                    # Accounting Entries
                    if diff * qty_available > 0:
                        debit_account_id = account_id
                        credit_account_id = product_accounts[product.id]['stock_valuation'].id
                    else:
                        debit_account_id = product_accounts[product.id]['stock_valuation'].id
                        credit_account_id = account_id

                    move_vals = {
                        'journal_id': product_accounts[product.id]['stock_journal'].id,
                        'company_id': location.company_id.id,
                        'ref': product.default_code,
                        'line_ids': [(0, 0, {
                            'name': _('%s changed cost from %s to %s - %s') % (self.env.user.name, product.standard_price, new_price, product.display_name),
                            'account_id': debit_account_id,
                            'debit': abs(diff * qty_available),
                            'credit': 0,
                            'product_id': product.id,
                        }), (0, 0, {
                            'name': _('%s changed cost from %s to %s - %s') % (self.env.user.name, product.standard_price, new_price, product.display_name),
                            'account_id': credit_account_id,
                            'debit': 0,
                            'credit': abs(diff * qty_available),
                            'product_id': product.id,
                        })],
                    }
                    move = AccountMove.create(move_vals)
                    move.post()
        data_history = {
            'standard_price' : new_price,
            'previous_standard_price' : standard_price,
            'modified_datetime' : datetime.datetime.now(),
            'product' : product.product_tmpl_id,
            'user' : env.user.id
        }
        raise UserError(_('Boom!  New price is: ' + str(new_price) + 'and old price is: ' + str(standard_price)))

        env['product.history.tracking'].create(data_history)
        self.write({
            'standard_price': new_price
            })
        return True