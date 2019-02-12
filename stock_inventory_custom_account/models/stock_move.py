# -*- coding: utf-8 -*-

from odoo import models, fields, _
from odoo.exceptions import UserError


class StockMove(models.Model):
    _inherit = 'stock.move'

    inventory_line_id = fields.Many2one('stock.inventory.line')

    def _account_entry_move(self):
        """ Accounting Valuation Entries """
        self.ensure_one()
        if self.inventory_line_id:
            acc_data = self.product_id.product_tmpl_id.get_product_accounts()
            caccount = self.env.user.company_id.stock_variation_account.id
            if not caccount:
                raise UserError(
                    _('Please configure the stock variation account')
                )
            debit = acc_data.get('expense').id
            credit = caccount
            if self.inventory_line_id.product_qty < \
                    self.inventory_line_id.theoretical_qty:
                debit = caccount
                credit = acc_data.get('expense').id

            self._create_account_move_line(
                credit,
                debit,
                acc_data.get('stock_journal') and
                acc_data.get('stock_journal').id or False
            )
        else:
            super(StockMove, self)._account_entry_move()
