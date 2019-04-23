# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import uuid
import time
import logging
import requests, json

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


class PosOrder(models.Model):
    _inherit = 'pos.order'

    def default_lane(self):
        lane = self.env['pos_vantiv_tripos_cloud.lane'].search([], limit=1)
        return lane

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

    def add_payment(self, data):
        time.sleep(100)
        statement_id = super(PosOrder, self).add_payment(data)

        print("entro en el payment")
        print(data)
        print("lane id ", self.lane_id)
        lane = self.lane_id
        # Payment request
        body = {}
        body['laneId'] = lane.lane_id
        body['transactionAmount'] = data.get('amount')

        guid = uuid.uuid4()
        config_obj = lane.configuration_id

        headers = {
            'User-agent':
            'Mozilla/5.0',
            'accept':
            'application/json',
            'content-type':
            'application/json',
            'charset':
            'utf-8',
            'tp-authorization':
            'Version=2.0',
            'tp-application-id':
            config_obj.express_api_credentials_application_id,
            'tp-application-name':
            config_obj.express_api_credentials_application_name,
            'tp-application-version':
            config_obj.express_api_credentials_application_version,
            'tp-express-acceptor-id':
            config_obj.express_api_credentials_acceptor_id,
            'tp-express-account-id':
            config_obj.express_api_credentials_account_id,
            'tp-express-account-token':
            config_obj.express_api_credentials_account_token,
            'tp-request-id':
            str(guid)
        }

        base_url = "https://triposcert.vantiv.com/api/v1/sale"

        print(base_url)
        print(headers)
        print(body)

        req = requests.post(
            url=base_url, headers=headers, data=json.dumps(body), timeout=65)

        print('Status Code', req.status_code)
        print('Headers', req.request.headers)
        print('Body', req.text)
        print(req.json)

        return statement_id