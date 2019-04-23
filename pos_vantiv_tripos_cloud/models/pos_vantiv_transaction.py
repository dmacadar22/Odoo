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


class PosVantivTransaction(models.Model):
    _name = 'pos_vantiv_tripos_cloud.transaction'

    @api.model
    def do_transaction(self, data):
        lane = self.env['pos_vantiv_tripos_cloud.lane'].search(
            [('id', '=', data.get('lane_id'))])

        if lane.exists():
            # Payment request
            body = {}
            body['laneId'] = lane.lane_id
            body['transactionAmount'] = data.get('amount_total')
            body['ReferenceNumber'] = random.randint(1, 101) * 5
            body['TicketNumber'] = random.randint(1, 101) * 5

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

            req = requests.post(
                url=base_url,
                headers=headers,
                data=json.dumps(body),
                timeout=65)
            # req.raise_for_status()
            response = req.json()

            print(response)
            return response

        return "lane not found"
