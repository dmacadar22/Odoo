# -*- coding: utf-8 -*-
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, models, _


class ResUsers(models.Model):
    _inherit = "res.users"

    authorized_picking_type_ids = fields.Many2many(string= Authorized Picking Types, 'stock.picking.type')