# -*- coding: utf-8 -*-
###############################################################################
#    License, author and contributors information in:                         #
#    __manifest__.py file at the root folder of this module.                  #
###############################################################################

import logging
import requests, json
from datetime import datetime, timedelta
from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

headers = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'charset': 'utf-8',
}


class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    uniqueOrderID = fields.Char(string="Uid")


class GeniusPurchaseOrder(models.Model):
    _name = 'genius.purchase.order'
    _inherit = ['mail.thread']
    _description = "Genius Orden de Compra"

    name = fields.Char(
        string="Nombre", compute="_compute_get_name", track_visibility=True)
    uniqueOrderID = fields.Char(string=_("Uid"))
    orderID = fields.Integer(string=_("Order ID"))
    storeID = fields.Integer(string=_("Store ID"))
    storeName = fields.Char(string=_("Store Name"))
    storePONumber = fields.Char(string=_("Store Number"))
    supplierID = fields.Char(string=_("Supplier ID"))
    supplierName = fields.Char(string=_("Supplier Name"))
    dateCreated = fields.Datetime(string=_("Created Date"))
    orderTotal = fields.Float(string=_("Total Amount"))
    orderSource = fields.Integer(string=_("Order Source"))
    orderStatus = fields.Integer(string=_("Order Status"))
    accountNumber = fields.Char(string=_("Account Number"))
    message = fields.Html(string=_("Message"))
    state = fields.Selection(
        string=_('State'),
        selection=[('draft', 'Draft'), ('done', 'Done')],
        default='draft',
    )

    order_line_ids = fields.One2many(
        comodel_name='genius.purchase.order.line',
        inverse_name='purchase_id',
        ondelete='cascade',
        string=_("Purchase Order Lines"))

    @api.multi
    def action_oc_draft(self):
        for rec in self:

            order = self.env['purchase.order'].search([('uniqueOrderID', '=',
                                                        rec.uniqueOrderID)])
            if order.exists():
                return

            supplier = self.env['res.partner'].search(
                [('supplier', '=', True), ('name', '=', rec.supplierName)],
                limit=1)

            if supplier.exists():
                order_lines = []
                order_vals = {
                    'partner_id': supplier.id,
                    # 'partner_ref': rec.supplierName,
                    'state': 'draft',
                    'date_order': rec.dateCreated,
                    'uniqueOrderID': rec.uniqueOrderID,
                    'order_line': order_lines
                }

                product_obj = self.env['product.product']
                for order_line in rec.order_line_ids:
                    product = product_obj.search(
                        [('barcode', '=', order_line.gtin)], limit=1)
                    if product.exists():
                        order_line_vals = {
                            'product_id': product.id,
                            'name': product.name,
                            'product_uom': product.uom_id.id,
                            'date_planned': rec.dateCreated,
                            'price_unit': product.standard_price,
                            'product_qty': order_line.quantity
                        }
                        order_lines.append((0, 0, order_line_vals))

                picking = self.env['stock.picking.type'].search(
                    [('barcode', '=', rec.storeID)], limit=1)
                if picking.exists():
                    order_vals['picking_type_id'] = picking.id

                self.env['purchase.order'].create(order_vals)
                rec.state = 'done'
            else:
                raise Warning('No existe el proveedor')

    @api.model
    def create(self, vals):
        order_id = super(
            GeniusPurchaseOrder,
            self.with_context(mail_create_nolog=True)).create(vals)

        #Create  a purchase.order
        # Get a Supplier
        supplier = self.env['res.partner'].search(
            [('supplier', '=', True), ('name', '=', vals.get('supplierName'))],
            limit=1)

        if supplier.exists():
            order_lines = []
            order_vals = {
                'partner_id': supplier.id,
                # 'partner_ref': vals.get('supplierName'),
                'state': 'draft',
                'date_order': vals.get('dateCreated', fields.Datetime.today),
                'uniqueOrderID': vals.get('uniqueOrderID'),
                'order_line': order_lines
            }

            product_obj = self.env['product.product']
            for order_line in vals.get('order_line_ids'):
                line = order_line[2]
                product = product_obj.search(
                    [('barcode', '=', line.get('gtin'))], limit=1)
                if product.exists():
                    order_line_vals = {
                        'product_id': product.id,
                        'name': product.name,
                        'product_uom': product.uom_id.id,
                        'date_planned': vals.get('dateCreated', fields.Datetime.today),
                        'price_unit': product.standard_price,
                        'product_qty': line.get('quantity')
                    }
                    order_lines.append((0, 0, order_line_vals))

            picking = self.env['stock.picking.type'].search(
                [('barcode', '=', vals.get('storeID'))], limit=1)
            if picking.exists():
                order_vals['picking_type_id'] = picking.id

            self.env['purchase.order'].create(order_vals)
            order_id.write({'state': 'done'})

        return order_id

    @api.depends('storeName', 'supplierName')
    def _compute_get_name(self):
        for rec in self:
            rec.name = "{} - {}".format(rec.storeName, rec.supplierName)

    @api.model
    def requests(self, connection=None, store_id=None, endpoints=''):

        req = None
        headers['Authorization'] = connection.access_token
        # payload = {'previouslyExportedOrders': False}
        base_url = "{}/stores/{}/{}?previouslyExportedOrders=false".format(
            connection.base_url, store_id, endpoints)

        req = requests.get('{}'.format(base_url), headers=headers, timeout=5)

        if req.status_code != 200 and connection.get_access_token():
            headers['Authorization'] = connection.access_token
            req = requests.get(
                '{}'.format(base_url), headers=headers, timeout=5)

        _logger.info("Url {} - status {}".format(base_url, req.status_code))

        return req

    @api.model
    def get_purchase_orders(self):
        connection = self.env['genius.swagger.connection'].search(
            [('type', '=', 'pro')], limit=1)

        if not connection.exists():
            return

        uniqueOrder_List = [item.uniqueOrderID for item in self.search([])]

        for store in connection.store_ids:
            req = self.requests(
                connection=connection,
                store_id=store.store_id,
                endpoints='orders')

            patch_orders = {'orders': []}
            orders = json.loads(req.content.decode('utf-8'))
            _logger.info("The Store {} have {} Purchase Orders".format(store.store_id, len(orders.get('orders'))))

            if len(orders.get('orders')):
                orders_list = [
                    orders for orders in orders.get('orders') if
                    not orders['header']['uniqueOrderID'] in uniqueOrder_List
                ]

                for order in orders_list:
                    uniqueOrderID = order['header'].get('uniqueOrderID')

                    order_json = {
                        "orderId": order['header'].get('orderID'),
                        "uniqueOrderID": uniqueOrderID,
                        "dateExported": order['header'].get('dateCreated')
                    }

                    patch_orders['orders'].append(order_json)

                    if not uniqueOrderID in uniqueOrder_List:
                        order_lines = []
                        order_vals = {
                            'uniqueOrderID': uniqueOrderID,
                            'orderID': order['header'].get('orderID'),
                            'storeID': order['header'].get('storeID'),
                            'storeName': order['header'].get('storeName'),
                            'storePONumber':
                            order['header'].get('storePONumber'),
                            'supplierID': order['header'].get('supplierID'),
                            'supplierName':
                            order['header'].get('supplierName'),
                            'dateCreated': order['header'].get('dateCreated'),
                            'orderTotal': order['header'].get('orderTotal'),
                            'orderSource': order['header'].get('orderSource'),
                            'orderStatus': order['header'].get('orderStatus'),
                            'accountNumber':
                            order['header'].get('accountNumber'),
                            'message': order['header'].get('message'),
                            'order_line_ids': order_lines
                        }

                        for item in order.get('details'):
                            vals = {
                                'supplierSKU': item.get('supplierSKU'),
                                'itemDescription': item.get('itemDescription'),
                                'cost': item.get('cost'),
                                'quantity': item.get('quantity'),
                                'uom': item.get('uom'),
                                'amount': int(item.get('quantity')) * float(
                                    item.get('cost')),
                                'gtin': item.get('gtin')
                            }
                            order_lines.append((0, 0, vals))

                        self.create(order_vals)

                if len(patch_orders['orders']):
                    # https://posapi.dev.geniuscentral.com/stores/100331/orders
                    headers['Authorization'] = connection.access_token
                    base_url = "{}/stores/{}/orders".format(
                        connection.base_url, store.store_id)

                    req = requests.patch('{}'.format(base_url),
                        headers=headers,
                        data=json.dumps(patch_orders),
                        timeout=5)

                    if req.status_code != 200 and connection.get_access_token(
                    ):
                        headers['Authorization'] = connection.access_token
                        req = requests.patch('{}'.format(base_url),
                            headers=headers,
                            data=patch_orders,
                            timeout=5)

        # return orders

    def redirect_purchases_orders_view(self):
        # Get lead views
        # self.get_purchase_orders()
        body = "Message has been approved on {}".format(datetime.now())
        self.message_post(body=body, subject="Subject", subtype="mt_note")

        action = self.env.ref(
            'genius_purchase.action_genius_purchase_order').read()[0]
        return action


class GeniusPurchaseOrderLine(models.Model):
    _name = 'genius.purchase.order.line'

    supplierSKU = fields.Char(string=_("SKU Supplier"))
    itemDescription = fields.Char(string=_("Product"))
    cost = fields.Float(string=_("Cost"))
    quantity = fields.Integer(string=_("Quantity"))
    uom = fields.Char(string=_("Uom"))
    gtin = fields.Char()
    amount = fields.Float(
        compute="_compute_get_amount", store=True, string=_("Amount"))
    purchase_id = fields.Many2one(
        comodel_name='genius.purchase.order', string=_("Órden de Compra"))

    @api.depends('quantity', 'cost')
    def _compute_get_amount(self):
        for rec in self:
            rec.amount = rec.quantity * rec.amount