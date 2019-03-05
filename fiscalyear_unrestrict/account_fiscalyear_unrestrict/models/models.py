# -*- coding: utf-8 -*-

from odoo import models, api


class AccountMove(models.Model):
    _name = "account.move"
    _inherit = "account.move"

    @api.multi
    def _check_lock_date(self):
        return True
