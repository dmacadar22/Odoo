# -*- coding: utf-8 -*-
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################
from odoo import models, fields, api, tools, _
import time
from odoo.tools import float_is_zero
from odoo.exceptions import UserError

import logging
_logger = logging.getLogger(__name__)

class pos_order(models.Model):
    _inherit = "pos.order"

    parent_return_order = fields.Char('Return Order ID', size=64)
    return_seq = fields.Integer('Return Sequence')
    return_process = fields.Boolean('Return Process')
    back_order = fields.Char('Back Order', size=256, default=False, copy=False)

    @api.multi
    def _order_fields(self, ui_order):
        res = super(pos_order, self)._order_fields(ui_order)
        res.update({
            'return_order':         ui_order.get('return_order', ''),
            'back_order':           ui_order.get('back_order', ''),
            'parent_return_order':  ui_order.get('parent_return_order', ''),
            'return_seq':           ui_order.get('return_seq', ''),
        })
        return res

    @api.model
    def _process_order(self, order):
        order_id = self.with_context({'from_pos':True}).create(self._order_fields(order))

        for payments in order['statement_ids']:
            if not order.get('sale_mode') and order.get('parent_return_order', ''):
                payments[2]['amount'] = payments[2]['amount'] or 0.0
            order_id.add_payment(self._payment_fields(payments[2]))

        session = self.env['pos.session'].browse(order['pos_session_id'])
        if session.sequence_number <= order['sequence_number']:
            session.write({'sequence_number': order['sequence_number'] + 1})
            session.refresh()

        if not order.get('parent_return_order', '') and not float_is_zero(order['amount_return'], self.env['decimal.precision'].precision_get('Account')):
            cash_journal = session.cash_journal_id
            if not cash_journal:
                cash_journal_ids = session.statement_ids.filtered(lambda st: st.journal_id.type == 'cash')
                if not len(cash_journal_ids):
                    raise Warning(_('error!'),
                        _("No cash statement found for this session. Unable to record returned cash."))
                cash_journal = cash_journal_ids[0].journal_id
            order_id.add_payment({
                'amount':-order['amount_return'],
                'payment_date': time.strftime('%Y-%m-%d %H:%M:%S'),
                'payment_name': _('return'),
                'journal': cash_journal.id,
            })

        if order.get('parent_return_order', '') and not float_is_zero(order['amount_return'], self.env['decimal.precision'].precision_get('Account')):
            cash_journal = session.cash_journal_id
            if not cash_journal:
                cash_journal_ids = session.statement_ids.filtered(lambda st: st.journal_id.type == 'cash')
                if not len(cash_journal_ids):
                    raise Warning(_('error!'),
                        _("No cash statement found for this session. Unable to record returned cash."))
                cash_journal = cash_journal_ids[0].journal_id
            order_id.add_payment({
                'amount':-order['amount_return'],
                'payment_date': time.strftime('%Y-%m-%d %H:%M:%S'),
                'payment_name': _('return'),
                'journal': cash_journal.id,
            })

        return order_id

    @api.one
    def scrap_picking(self, full = False, scrap_line = []):
        Picking = self.env['stock.picking']
        Move = self.env['stock.move']
        StockWarehouse = self.env['stock.warehouse']
        address = self.partner_id.address_get(['delivery']) or {}
        picking_type = self.picking_type_id
        return_pick_type = self.picking_type_id.return_picking_type_id or self.picking_type_id
        message = _("This transfer has been created from the point of sale session: <a href=# data-oe-model=pos.order data-oe-id=%d>%s</a>") % (self.id, self.name)
        if self.partner_id:
            source_location = self.partner_id.property_stock_customer.id
        else:
            if (not picking_type) or (not picking_type.default_location_dest_id):
                customerloc, supplierloc = StockWarehouse._get_partner_locations()
                source_location = customerloc.id
            else:
                source_location = picking_type.default_location_dest_id.id
        picking_vals = {
            'origin': self.name,
            'partner_id': address.get('delivery', False),
            'date_done': self.date_order,
            'picking_type_id': picking_type.id,
            'company_id': self.company_id.id,
            'move_type': 'direct',
            'note': self.note or "",
            'location_id': source_location,
            'location_dest_id': self.session_id.config_id.scrap_location_id.id,
        }
        return_vals = picking_vals.copy()
        return_vals.update({
            'location_id': source_location,
            'location_dest_id': self.session_id.config_id.scrap_location_id.id,
            'picking_type_id': return_pick_type.id
        })
        return_picking = Picking.create(return_vals)
        return_picking.message_post(body=message)
        for line in scrap_line:
            Move.create({
                'name': line.name,
                'product_uom': line.product_id.uom_id.id,
                'picking_id': return_picking.id,
                'picking_type_id': return_pick_type.id,
                'product_id': line.product_id.id,
                'product_uom_qty': abs(line.qty),
                'state': 'draft',
                'location_id': source_location,
                'location_dest_id': self.session_id.config_id.scrap_location_id.id,
            })
        if full:
            self.write({'picking_id' : return_picking.id})
        self._force_picking_done(return_picking)
        return True

    def create_picking(self):
        """Create a picking for each order and validate it."""
        Picking = self.env['stock.picking']
        Move = self.env['stock.move']
        StockWarehouse = self.env['stock.warehouse']
        full_scrap = False
        for order in self:
            if not order.lines.filtered(lambda l: l.product_id.type in ['product', 'consu']):
                continue
            scrap_lines = order.lines.filtered(lambda l: l.product_id.type in ['product', 'consu'] and l.scrap_item and not float_is_zero(l.qty, precision_digits=l.product_id.uom_id.rounding))
            if len(scrap_lines) == len(order.lines):
                full_scrap = True
            else:
                full_scrap = False
            if scrap_lines:
                self.scrap_picking(full_scrap, scrap_lines)
            address = order.partner_id.address_get(['delivery']) or {}
            picking_type = order.picking_type_id
            return_pick_type = order.picking_type_id.return_picking_type_id or order.picking_type_id
            order_picking = Picking
            return_picking = Picking
            moves = Move
            location_id = order.location_id.id
            if not full_scrap:
                if order.partner_id:
                    destination_id = order.partner_id.property_stock_customer.id
                else:
                    if (not picking_type) or (not picking_type.default_location_dest_id):
                        customerloc, supplierloc = StockWarehouse._get_partner_locations()
                        destination_id = customerloc.id
                    else:
                        destination_id = picking_type.default_location_dest_id.id
                if picking_type:
                    message = _("This transfer has been created from the point of sale session: <a href=# data-oe-model=pos.order data-oe-id=%d>%s</a>") % (order.id, order.name)
                    picking_vals = {
                        'origin': order.name,
                        'partner_id': address.get('delivery', False),
                        'date_done': order.date_order,
                        'picking_type_id': picking_type.id,
                        'company_id': order.company_id.id,
                        'move_type': 'direct',
                        'note': order.note or "",
                        'location_id': location_id,
                        'location_dest_id': destination_id,
                    }
                    pos_qty = any([x.qty > 0 for x in order.lines if x.product_id.type in ['product', 'consu']])
                    if pos_qty:
                        order_picking = Picking.create(picking_vals.copy())
                        order_picking.message_post(body=message)
                    neg_qty = any([x.qty < 0 for x in order.lines if x.product_id.type in ['product', 'consu']])
                    if neg_qty:
                        return_vals = picking_vals.copy()
                        return_vals.update({
                            'location_id': destination_id,
                            'location_dest_id': return_pick_type != picking_type and return_pick_type.default_location_dest_id.id or location_id,
                            'picking_type_id': return_pick_type.id
                        })
                        return_picking = Picking.create(return_vals)
                        return_picking.message_post(body=message)

                for line in order.lines.filtered(lambda l: l.product_id.type in ['product', 'consu'] and not l.scrap_item and not float_is_zero(l.qty, precision_digits=l.product_id.uom_id.rounding)):
                    moves |= Move.create({
                        'name': line.name,
                        'product_uom': line.product_id.uom_id.id,
                        'picking_id': order_picking.id if line.qty >= 0 else return_picking.id,
                        'picking_type_id': picking_type.id if line.qty >= 0 else return_pick_type.id,
                        'product_id': line.product_id.id,
                        'product_uom_qty': abs(line.qty),
                        'state': 'draft',
                        'location_id': location_id if line.qty >= 0 else destination_id,
                        'location_dest_id': destination_id if line.qty >= 0 else return_pick_type != picking_type and return_pick_type.default_location_dest_id.id or location_id,
                    })

#             prefer associating the regular order picking, not the return

                order.write({'picking_id': order_picking.id or return_picking.id})

                if return_picking:
                    order._force_picking_done(return_picking)
                if order_picking:
                    order._force_picking_done(order_picking)

                # //when the pos.config has no picking_type_id set only the moves will be created
                if moves and not return_picking and not order_picking:
                    tracked_moves = moves.filtered(lambda move: move.product_id.tracking != 'none')
                    untracked_moves = moves - tracked_moves
                    tracked_moves.action_confirm()
                    untracked_moves.action_assign()
                    moves.filtered(lambda m: m.state in ['confirmed', 'waiting']).force_assign()
                    moves.filtered(lambda m: m.product_id.tracking == 'none').action_done()

        return True
    #
    @api.model
    def create_from_ui(self, orders):
        # //Keep only new orders
        submitted_references = [o['data']['name'] for o in orders]
        existing_order_ids = self.search([('pos_reference', 'in', submitted_references)])
        existing_orders = self.read(existing_order_ids, ['pos_reference'])
        existing_references = set([o['pos_reference'] for o in existing_orders])
        orders_to_save = [o for o in orders if o['data']['name'] not in existing_references]

        order_ids = []

        for tmp_order in orders_to_save:
            to_invoice = tmp_order['to_invoice']
            order = tmp_order['data']
            order_id = self._process_order(order)
            if order_id:
                    pos_line_obj = self.env['pos.order.line']
                    to_be_returned_items = {}
                    for line in order.get('lines'):
                        if line[2].get('return_process'):
                            if to_be_returned_items.get(line[2].get('product_id')):
                                to_be_returned_items[line[2].get('product_id')] = to_be_returned_items[line[2].get('product_id')] + line[2].get('qty')
                            else:
                                to_be_returned_items.update({line[2].get('product_id'):line[2].get('qty')})
                    for line in order.get('lines'):
                        for item_id in to_be_returned_items:
                            if line[2].get('return_process'):
                                for origin_line in self.browse([line[2].get('return_process')[0]]).lines:
                                    if to_be_returned_items[item_id] == 0:
                                        continue
                                    if origin_line.return_qty > 0 and item_id == origin_line.product_id.id:
                                        if (to_be_returned_items[item_id] * -1) >= origin_line.return_qty:
                                            ret_from_line_qty = 0
                                            to_be_returned_items[item_id] = to_be_returned_items[item_id] + origin_line.return_qty
                                        else:
                                            ret_from_line_qty = to_be_returned_items[item_id] + origin_line.return_qty
                                            to_be_returned_items[item_id] = 0
                                        origin_line.write({'return_qty': ret_from_line_qty});
            order_ids.append(order_id.id)

            try:
                order_id.action_pos_order_paid()
            except Exception as e:
                _logger.error('Could not fully process the POS Order: %s', tools.ustr(e))

            if to_invoice:
                order_id.action_invoice()
                self.env['account.invoice'].signal_workflow([order_id.invoice_id.id], 'invoice_open')

        return order_ids

class pos_order_line(models.Model):
    _inherit = "pos.order.line"

    return_qty = fields.Integer('Return QTY', size=64)
    return_process = fields.Char('Return Process')
    back_order = fields.Char('Back Order', size=256, default=False, copy=False)
    scrap_item = fields.Boolean("Scrap Item")


class pos_config(models.Model):
    _inherit = "pos.config"

    enable_pos_return = fields.Boolean("Enable Return from POS")
    scrap_location_id = fields.Many2one("stock.location", "Scrap Stock Locaiton")

class AccountBankStatementLine(models.Model):
    _inherit = "account.bank.statement.line"

    @api.one
    @api.constrains('amount')
    def _check_amount(self):
        if not self._context.get('from_pos'):
            super(AccountBankStatementLine, self)._check_amount()

    @api.one
    @api.constrains('amount', 'amount_currency')
    def _check_amount_currency(self):
        if not self._context.get('from_pos'):
            super(AccountBankStatementLine, self)._check_amount_currency()