# -*- coding: utf-8 -*-

from collections import defaultdict

from odoo import api, fields, models, tools, _
from odoo.exceptions import UserError
from odoo.tools import float_compare, float_round, float_is_zero, pycompat
from odoo.addons import decimal_precision as dp
from datetime import datetime
import logging

_logger = logging.getLogger(__name__)

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


class ProductProduct(models.Model):
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

    #@api.multi
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
            'previous_standard_price' : self.standard_price,
            'list_price' : self.list_price, #Maintaining consistency; this value is updated through an automated action
            'previous_list_price' : self.list_price, #See above
            'modified_datetime' : datetime.now(),
            'product' : self.product_tmpl_id.id,
            'user' : self.env.user.id
        }
        #raise UserError(_('Boom!  New price is: ' + str(new_price) + 'and old price is: ' + str(standard_price)))

        self.env['product.history.tracking'].create(data_history)
        self.write({
            'standard_price': new_price
            })
        return True

class StockMove(models.Model):
    _inherit = "stock.move"
    def product_price_update_before_done(self, forced_qty=None):
        tmpl_dict = defaultdict(lambda: 0.0)
        # adapt standard price on incomming moves if the product cost_method is 'average'
        std_price_update = {}
        for move in self.filtered(lambda move: move._is_in() and move.product_id.cost_method == 'average'):
            product_tot_qty_available = move.product_id.qty_available + tmpl_dict[move.product_id.id]
            rounding = move.product_id.uom_id.rounding

            qty_done = move.product_uom._compute_quantity(move.quantity_done, move.product_id.uom_id)
            qty = forced_qty or qty_done
            # If the current stock is negative, we should not average it with the incoming one
            if float_is_zero(product_tot_qty_available, precision_rounding=rounding) or product_tot_qty_available < 0:
                new_std_price = move._get_price_unit()
            elif float_is_zero(product_tot_qty_available + move.product_qty, precision_rounding=rounding) or \
                    float_is_zero(product_tot_qty_available + qty, precision_rounding=rounding):
                new_std_price = move._get_price_unit()
            else:
                # Get the standard price
                amount_unit = std_price_update.get((move.company_id.id, move.product_id.id)) or move.product_id.standard_price
                new_std_price = ((amount_unit * product_tot_qty_available) + (move._get_price_unit() * qty)) / (product_tot_qty_available + qty)

            tmpl_dict[move.product_id.id] += qty_done
            
        data_history = {
            'standard_price' : new_std_price,
            'previous_standard_price' : move.product_id.standard_price,
            'list_price' : move.product_id.list_price, #Maintaining consistency; this value is updated through an automated action
            'previous_list_price' : move.product_id.list_price, #See above
            'modified_datetime' : datetime.now(),
            'product' : move.product_id.product_tmpl_id.id,
            'user' : self.env.user.id
        }

        self.env['product.history.tracking'].create(data_history)
            
        # Write the standard price, as SUPERUSER_ID because a warehouse manager may not have the right to write on products
        move.product_id.with_context(force_company=move.company_id.id).sudo().write({'standard_price': new_std_price})
        std_price_update[move.company_id.id, move.product_id.id] = new_std_price
