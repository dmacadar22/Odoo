# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import uuid
import time
import logging
import requests, json
import werkzeug
import random

from odoo import fields, models, api, _
from odoo.exceptions import UserError

from . import config

headers = {
    'content-type': 'application/json',
    'charset': 'utf-8',
    'tp-authorization': 'Version=2.0',
    'tp-application-id': '',
    'tp-application-name': '',
    'tp-application-version': '',
    'tp-express-acceptor-id': '',
    'tp-express-account-id': '',
    'tp-express-account-token': '',
    'tp-request-id': '',
}

_logger = logging.getLogger(__name__)


class PosOrder(models.Model):
    _inherit = 'pos.order'

    def default_lane(self):
        lane = self.env['pos_vantiv_tripos_cloud.lane'].search([], limit=1)
        return lane.id

    lane_id = fields.Many2one(
        comodel_name='pos_vantiv_tripos_cloud.lane',
        string=_('Lane'),
        required=True)

    @api.model
    def _order_fields(self, ui_order):
        order_fields = super(PosOrder, self)._order_fields(ui_order)
        order_fields['lane_id'] = ui_order.get('lane_id', False)
        return order_fields

    @api.model
    def _payment_fields(self, ui_paymentline):
        fields = super(PosOrder, self)._payment_fields(ui_paymentline)

        fields.update({
            'lane_id': ui_paymentline.get('lane_id'),
        })

        return fields
    