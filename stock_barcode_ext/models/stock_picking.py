# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError, ValidationError


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    amount_total = fields.Float(string="Invoice Total", digits=dp.get_precision('Product Price'), states={
        'done': [('readonly', True)],
        'cancel': [('readonly', True)],
    }, readonly=False)

    partial_amount_total = fields.Float(string="Invoice Partial Total", digits=dp.get_precision('Product Price'), compute="compute_partial_amount")

    freight_charges = fields.Float(string="Freight Charges", digits=dp.get_precision('Product Price'),)
    distribute_freight = fields.Boolean(string="Distribute Freight?")
    miscellaneous_charges = fields.Float(string="Miscellaneous Charges", digits=dp.get_precision('Product Price'),)
    discount = fields.Float(string="Discounts", digits=dp.get_precision('Product Price'),)
    tax = fields.Float(string="Taxes", digits=dp.get_precision('Product Price'),)

    @api.onchange('freight_charges')
    def onchange_freight_charges(self):
        self.amount_total += self.freight_charges

    @api.onchange('distribute_freight')
    def onchange_distribute_freight(self):
        self.amount_total += self.distribute_freight

    @api.onchange('discount')
    def onchange_discount(self):
        self.amount_total -= self.discount

    @api.onchange('tax')
    def onchange_tax(self):
        self.amount_total += self.tax

    @api.depends('move_line_ids')
    def compute_partial_amount(self):
        for rec in self:
            rec.partial_amount_total = sum(rec.move_line_ids.mapped('price_subtotal'))

    def get_barcode_view_state(self):
        """ Return the initial state of the barcode view as a dict.
        """
        fields_to_read = self._get_picking_fields_to_read()
        pickings = self.read(fields_to_read)
        for picking in pickings:
            picking['move_line_ids'] = self.env['stock.move.line'].browse(picking.pop('move_line_ids')).read([
                'product_id',
                'location_id',
                'location_dest_id',
                'qty_done',
                'display_name',
                'product_uom_qty',
                'product_uom_id',
                'product_barcode',
                'owner_id',
                'lot_id',
                'lot_name',
                'package_id',
                'result_package_id',
                'dummy_id',
                'price_subtotal',
                'list_price', 'standard_price', 'profit_margin', 'amount_total', 'qty_done_virtual'
            ])
            for move_line_id in picking['move_line_ids']:
                move_line_id['product_id'] = \
                    self.env['product.product'].browse(move_line_id.pop('product_id')[0]).read([
                        'id',
                        'tracking',
                        'barcode',
                    ])[0]
                move_line_id['location_id'] = \
                    self.env['stock.location'].browse(move_line_id.pop('location_id')[0]).read([
                        'id',
                        'display_name',
                    ])[0]
                move_line_id['location_dest_id'] = \
                    self.env['stock.location'].browse(move_line_id.pop('location_dest_id')[0]).read([
                        'id',
                        'display_name',
                    ])[0]
            picking['location_id'] = self.env['stock.location'].browse(picking.pop('location_id')[0]).read([
                'id',
                'display_name',
                'parent_path'
            ])[0]
            picking['location_dest_id'] = self.env['stock.location'].browse(picking.pop('location_dest_id')[0]).read([
                'id',
                'display_name',
                'parent_path'
            ])[0]
            picking['group_stock_multi_locations'] = self.env.user.has_group('stock.group_stock_multi_locations')
            picking['group_tracking_owner'] = self.env.user.has_group('stock.group_tracking_owner')
            picking['group_tracking_lot'] = self.env.user.has_group('stock.group_tracking_lot')
            picking['group_production_lot'] = self.env.user.has_group('stock.group_production_lot')
            picking['group_uom'] = self.env.user.has_group('uom.group_uom')
            picking['use_create_lots'] = self.env['stock.picking.type'].browse(
                picking['picking_type_id'][0]).use_create_lots
            picking['use_existing_lots'] = self.env['stock.picking.type'].browse(
                picking['picking_type_id'][0]).use_existing_lots
            picking['show_entire_packs'] = self.env['stock.picking.type'].browse(
                picking['picking_type_id'][0]).show_entire_packs
            picking['actionReportDeliverySlipId'] = self.env.ref('stock.action_report_delivery').id
            if self.env.user.company_id.nomenclature_id:
                picking['nomenclature_id'] = [self.env.user.company_id.nomenclature_id.id]
        return pickings

    def _get_picking_fields_to_read(self):
        """ Return the default fields to read from the picking.
        """
        return [
            'move_line_ids',
            'picking_type_id',
            'location_id',
            'location_dest_id',
            'name',
            'state',
            'picking_type_code',
            'amount_total',
            'partial_amount_total'
        ]

    @api.multi
    def button_validate(self):
        if not self._context:
            if self.move_line_ids:
                total = sum([move_line.price_subtotal for move_line in self.move_line_ids])
                if self.amount_total != total:
                    raise UserError(_('Error. The amounts are different. Invoice amount {} - Receiving amount {}'.format(
                        self.amount_total, total)))

        res = super(StockPicking, self).button_validate()
        return res

    def open_action_receive(self):
        self.ensure_one()
        action = self.env.ref('stock_barcode.stock_barcode_picking_client_action').read()[0]
        params = {
            'model': 'stock.picking',
            'picking_id': self.id,
            'nomenclature_id': [self.env.user.company_id.nomenclature_id.id],
        }
        return dict(action, target='fullscreen', params=params)
