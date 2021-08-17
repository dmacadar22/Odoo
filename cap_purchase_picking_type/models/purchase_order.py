# -*- coding: utf-8 -*-
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, models, _
from odoo.addons.purchase.models.purchase import PurchaseOrder as Purchase


class PurchaseOrder(models.Model):
    _inherit = "purchase.order"

    authorized_picking_type_ids = fields.Many2many('stock.picking.type', 
                                                    string='Authorized Picking Types', 
                                                    related='user_id.authorized_picking_type_ids')

    @api.model
    def _new_default_picking_type(self):
        if len(self.env.user.authorized_picking_type_ids) == 0:
            type_obj = self.env['stock.picking.type']
            company_id = self.env.context.get('company_id') or self.env.user.company_id.id
            types = type_obj.search([('code', '=', 'incoming'), ('warehouse_id.company_id', '=', company_id)])
            if not types:
                types = type_obj.search([('code', '=', 'incoming'), ('warehouse_id', '=', False)])
            return types[:1]
        elif len(self.env.user.authorized_picking_type_ids) == 1:
            return self.env.user.authorized_picking_type_ids[0].id
        else:
            return False


    picking_type_id = fields.Many2one('stock.picking.type', 'Deliver To', 
                                    states=Purchase.READONLY_STATES, required=True, 
                                    default=_new_default_picking_type,
                                    help="This will determine operation type of incoming shipment")
