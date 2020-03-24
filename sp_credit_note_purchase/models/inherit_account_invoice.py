# -*- coding: utf-8 -*-

from odoo import api, fields, models, _


def _prepare_invoice_line(i, line):
    data = {
        'name': i.name,
        'origin': i.origin,
        'uom_id': i.product_uom.id,
        'product_id': i.product_id.id,
        'price_unit': i.price_unit,
        'quantity': line.product_qty - line.qty_received,
        'account_analytic_id': line.account_analytic_id,
        'analytic_tag_ids': line.analytic_tag_ids,
        'invoice_line_tax_ids': line.taxes_id
    }
    return data


class AccountInvoice(models.Model):
    _inherit = "account.invoice"

    purchase_order_id = fields.Many2one(
        'purchase.order',
        string='Purchase Order',
        help="Purchase Order.")

    @api.onchange('purchase_order_id')
    def _onchange_purchase_order(self):
        if not self.purchase_order_id:
            return {}
        self.currency_id = self.purchase_order_id.currency_id
        new_lines = self.env['account.invoice.line']

        for line in self.purchase_order_id.order_line:
            if line.product_qty > line.qty_received:
                for i in line.move_ids.filtered(
                        lambda r: r.state == 'done'
                ):
                    new_lines = new_lines.new(
                        _prepare_invoice_line(i, line)
                    )
                    self.invoice_line_ids += new_lines
                    new_lines._onchange_product_id()
        return {}
