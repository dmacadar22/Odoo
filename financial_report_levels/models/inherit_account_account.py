# -*- encoding: utf-8 -*-

from openerp import models, fields, api


class AccountAccount(models.Model):
    _inherit = 'account.account'

    parent_id = fields.Many2one(
        'account.account',
        string="Parent",
    )
    level = fields.Integer(
        string="Level",
        compute="_compute_level",
        store=True
    )

    @api.multi
    @api.depends('parent_id')
    def _compute_level(self):
        """
        Compute the account level
        """
        for rec in self:
            if rec.parent_id:
                current = rec
                level = 0
                while current.parent_id:
                    level += 1
                    current = current.parent_id
                rec.level = level
            else:
                rec.level = 0