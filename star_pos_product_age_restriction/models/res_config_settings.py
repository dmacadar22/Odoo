# -*- coding: utf-8 -*-
# Part of The Stella IT Solutions. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class POSDemoConfigSettings(models.Model):
    _name = 'pos.demo.data.age'
    _description = "Temporary data store for POS message."

    eligible_message = fields.Char(
        string="Eligible Message", help="This message will be displayed in POS when the customer is eligible to purchase that product.", translate=True)
    not_eligible_message = fields.Char(
        string="Not Eligible Message", help="This message will be displayed in POS when the customer is not eligible to purchase that product.", translate=True)


class POSConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    eligible_message = fields.Char(
        string="Eligible Message", help="This message will be displayed in POS when the customer is eligible to purchase that product.", translate=True)
    not_eligible_message = fields.Char(
        string="Not Eligible Message", help="This message will be displayed in POS when the customer is not eligible to purchase that product.", translate=True)

    @api.model
    def get_values(self):
        res = super(POSConfigSettings, self).get_values()
        res.update(
            eligible_message=self.env.ref(
                'star_pos_product_age_restriction.custom_pos_demo_data').eligible_message,
            not_eligible_message=self.env.ref(
                'star_pos_product_age_restriction.custom_pos_demo_data').not_eligible_message,
        )
        return res

    @api.multi
    def set_values(self):
        super(POSConfigSettings, self).set_values()
        self.env.ref('star_pos_product_age_restriction.custom_pos_demo_data').write({
            'eligible_message': self.eligible_message,
            'not_eligible_message': self.not_eligible_message,
        })
