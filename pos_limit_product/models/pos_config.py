# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import datetime
from uuid import uuid4

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class PosConfig(models.Model):
    _inherit = 'pos.config'
    _description = 'Point of Sale Configuration Inherit'

    product_limit = fields.Integer(
        string='Point of Sale Product Limit',
        default=100
    )
