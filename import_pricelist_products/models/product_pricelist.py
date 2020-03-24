# -*- coding: utf-8 -*-
###############################################################################
#    License, author and contributors information in:                         #
#    __manifest__.py file at the root folder of this module.                  #
###############################################################################

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class Pricelist(models.Model):
    _inherit = "product.pricelist"

    def action_import_products(self):
        print('entro a la action del import')
        action = self.env.ref(
            "import_pricelist_products.import_product_wizard_form")
        print(action)

        return {
            'name': 'Import products',
            'type': 'ir.actions.act_window',
            'view_type': 'form',
            'view_mode': 'form',
            'res_model': 'import.product.wizard',
            # 'view_id': self.env.ref("import_product_wizard_form").id,
            # 'context': {
            #     'current_id': self.id
            # },
            'target': 'new',
            'nodestroy': True,
        }
