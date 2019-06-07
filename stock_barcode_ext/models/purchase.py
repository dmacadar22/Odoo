# -*- coding: utf-8 -*-

from odoo import models, fields, api, _


class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    @api.model
    def _prepare_picking(self):
        res = super(PurchaseOrder, self)._prepare_picking()
        res.update({'amount_total': self.amount_total})
        return res


class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    @api.model
    def create(self, values):
        line = models.Model.create(self, values)
        # line = super(PurchaseOrderLine, self).create(values)
        print('barcode ', self._context)
        if line.order_id.state == 'purchase' and not self._context.get('stock_barcode_ext', False):
            line._create_or_update_picking()
        return line
