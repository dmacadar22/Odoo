# -*- coding: utf-8 -*-
from odoo import models, api, fields


class ResPartner(models.Model):
    _inherit = 'res.partner'

    flag = fields.Boolean(string='Flag', readonly=True, default=False)
    pos_note = fields.Text(string='POS Note', translate=False)

    @api.model
    def change_customer_details(self, details):
        # Method to change the customer details
        partner_id = self.search([('id', '=', details['id'])])
        values = {
            'name': details.get('name'),
            'street': details.get('street'),
            'zip': details.get('zip'),
            'city': details.get('city'),
            'state_id': details.get('state_id'),
            'country_id': details.get('country_id'),
            'email': details.get('email'),
            'phone': details.get('ph_no'),
            'x_studio_date_of_birth': details.get('dob') or False,
        }
        partner_id.write(values)
        return values
