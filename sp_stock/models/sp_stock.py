# -*- coding: utf-8 -*-

from odoo import api, fields, models


class SpStockMove(models.Model):
    _inherit = "stock.move"

    # Fields declaration
    department_id = fields.Many2one('hr.department', string='Department', compute='_compute_department_id', store=True)

    # compute and search fields, in the same order that fields declaration
    @api.multi
    @api.depends('product_id')
    def _compute_department_id(self):
        for rec in self:
            rec.department_id = rec.product_id and rec.product_id.categ_id.department_id and \
                                rec.product_id.categ_id.department_id.id or False
