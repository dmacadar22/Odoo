# -*- coding: utf-8 -*-

from odoo import api, fields, models


class SpStockMove(models.Model):
    _inherit = "stock.move"

    @api.multi
    def _get_accounting_data_for_valuation(self):
        '''
        Override get data for valuation for set specific category scrap
        account.
        :return: dict
        '''
        journal_id, acc_src, acc_dest, acc_valuation = super(
            SpStockMove, self
        )._get_accounting_data_for_valuation()
        if self.location_dest_id.scrap_location and \
                self.product_id.categ_id.scrap_account_id:
            acc_dest = self.product_id.categ_id.scrap_account_id.id
        return journal_id, acc_src, acc_dest, acc_valuation
