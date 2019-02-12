# -*- coding: utf-8 -*-

from odoo import models


class InventoryLine(models.Model):
    _inherit = 'stock.inventory.line'

    def _get_move_values(self, qty, location_id, location_dest_id, out):
        self.ensure_one()
        res = super(InventoryLine, self)._get_move_values(
            qty, location_id, location_dest_id, out
        )
        res['inventory_line_id'] = self.id
        return res
