# -*- coding: utf-8 -*-

from odoo import fields, models


class SpStockProductCategory(models.Model):
    _inherit = "product.category"

    department_id = fields.Many2one('hr.department', string='Department')
