# -*- coding: utf-8 -*-
# Part of The Stella IT Solutions. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api


class CustomProductTemplate(models.Model):
    _inherit = "product.template"

    apply_age_limit = fields.Boolean(
        string='Apply Age Limit?', help="Do you want to set the age limit to purchase this product?")
    cust_minimum_age = fields.Integer(
        string="Customer's Minimum Age", help="Minimum age required by the customer to purchase this product.")


class CustomProductProduct(models.Model):
    _inherit = "product.product"

    apply_age_limit = fields.Boolean(string='Apply Age Limit?',
                                     related='product_tmpl_id.apply_age_limit',
                                     help="Do you want to set the age limit to purchase this product?")
    cust_minimum_age = fields.Integer(string="Customer's Minimum Age",
                                      related='product_tmpl_id.cust_minimum_age',
                                      help="Minimum age required by the customer to purchase this product.")
