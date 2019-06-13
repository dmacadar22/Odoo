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

    partial_amount_total = fields.Float(string="Invoice Partial Total", digits=dp.get_precision('Product Price'),
                                        compute="compute_partial_amount")

    freight_charges = fields.Float(string="Freight Charges", digits=dp.get_precision('Product Price'), )
    distribute_freight = fields.Boolean(string="Distribute Freight?")
    miscellaneous_charges = fields.Float(string="Miscellaneous Charges", digits=dp.get_precision('Product Price'), )
    discount = fields.Float(string="Discounts", digits=dp.get_precision('Product Price'), )
    tax = fields.Float(string="Taxes", digits=dp.get_precision('Product Price'), )
    is_converted = fields.Boolean(default=False)

    @api.onchange('miscellaneous_charges')
    def onchange_miscellaneous_charges(self):
        self.amount_total += self.miscellaneous_charges

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
            rec.partial_amount_total = round(sum(rec.move_line_ids.mapped('price_subtotal')), 2)

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
                'list_price', 'standard_price', 'profit_margin', 'amount_total'
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
    def do_purchase_order(self):
        """
        PO Selection state - purchase
        PO m2o partner_id
        PO Datetime date_order
        PO Datetime date_planned
        PO Date date_approve
        PO m2o currency_id
        PO m2o company_id
        PO m2o user_id
        PO selection invoice_status to_invoice
        PO m2o picking_type_id
        PO o2m order_line
        """

        for record in self:
            if record.partner_id:
                # order_lines = []
                order_vals = {
                    'partner_id': record.partner_id.id,
                    'company_id': record.company_id.id,
                    'state': 'purchase',
                    'user_id': self.env.user.id,
                    'invoice_status': 'to invoice',
                    'date_order': record.date,
                    'date_planned': record.date,
                    'date_approve': record.date,
                    # 'order_line': order_lines,
                    'picking_type_id': record.picking_type_id.id
                }

                order_id = self.env['purchase.order'].with_context({'stock_barcode_ext': True}).create(order_vals)

                for move_line in record.move_line_ids:
                    product = move_line.product_id

                    order_line_vals = {
                        'order_id': order_id.id,
                        'product_id': product.id,
                        'name': product.name,
                        'product_uom': product.uom_id.id,
                        'date_planned': move_line.date,
                        'price_unit': move_line.standard_price,
                        'product_qty': move_line.qty_done,
                        'qty_received': move_line.qty_done,
                    }
                    order_line = self.env['purchase.order.line'].with_context({'stock_barcode_ext': True}).create(
                        order_line_vals)
                    move_line.move_id.purchase_line_id.write({'order_line': order_line.id})

                for move_line in record.move_line_ids:
                    product = move_line.product_id
                    lines = self.env['purchase.order.line'].search([('state', 'in', ('purchase','done'))]).filtered(lambda r: r.product_id.id == product.id)
                    costs = sum([line.price_unit for line in lines])
                    if product.purchased_product_qty:
                        product.write({'standard_price': round(costs / product.purchased_product_qty, 2)})

                record.is_converted = True
                record.origin = order_id.name

    @api.multi
    def button_validate(self):
        self.ensure_one()

        if not self._context:
            if self.move_line_ids:
                purchase_lines = self.move_line_ids.mapped('move_id.purchase_line_id')
                if purchase_lines:
                    self.is_converted = True
                    for move_line in self.move_line_ids:
                        purchase_line = move_line.move_id.purchase_line_id
                        if purchase_line.exists():
                            order_id = purchase_line.order_id
                            if order_id.state == 'purchase':
                                purchase_line.write({'price_unit': move_line.standard_price})

                        product = purchase_line.product_id
                        lines = self.env['purchase.order.line'].search([('state', 'in', ('purchase','done'))]).filtered(lambda r: r.product_id.id == product.id)
                        costs = sum([line.price_unit for line in lines])
                        if product.purchased_product_qty:
                            product.write({'standard_price': round(costs / product.purchased_product_qty, 2)})

                else:
                    self.do_purchase_order()

        #         total = sum([move_line.price_subtotal for move_line in self.move_line_ids])
        #         if self.amount_total != total:
        #             raise UserError(_('Error. The amounts are different. Invoice amount {} - Receiving amount {}'.format(
        #                 self.amount_total, total)))

        # res = super(StockPicking, self).button_validate()
        return False

    def open_action_receive(self):
        self.ensure_one()
        action = self.env.ref('stock_barcode.stock_barcode_picking_client_action').read()[0]
        params = {
            'model': 'stock.picking',
            'picking_id': self.id,
            'nomenclature_id': [self.env.user.company_id.nomenclature_id.id],
        }
        return dict(action, target='fullscreen', params=params)
