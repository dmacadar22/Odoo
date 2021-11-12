# -*- coding: utf-8 -*-

from odoo import models, fields, api, _


class PosConfig(models.Model):
    _inherit = 'pos.config'

    account_analytic_id = fields.Many2one(
        comodel_name='account.analytic.account',
        string='Analytic Account',
    )


class PosOrder(models.Model):
    _inherit = 'pos.order'

    account_analytic_id = fields.Many2one(
        comodel_name='account.analytic.account', copy=False,
        string='Analytic Account')

    @api.multi
    def action_pos_order_done(self):
        for rec in self:
            analytic_account = rec.session_id.config_id.account_analytic_id
            if analytic_account:
                rec.write({"account_analytic_id": analytic_account.id})
                rec.lines.write({"account_analytic_id": analytic_account.id})
        return super(PosOrder, self).action_pos_order_done()

    @api.model
    def _prepare_analytic_account(self, line):
        return line.order_id.session_id.config_id.account_analytic_id.id

    # FIXME: easiest way to solve it by contribute to Odoo SA and solve it in source code
    def _prepare_account_move_and_lines(self, session=None, move=None):
        """
        Override function
        to add analytic account for COGS and Stock Interim Account (Delivered)
        account based on company configuration.
        :param session: pos session
        :param move: account move if it created
        :return: account move lines values
        """
        res = super(PosOrder, self)._prepare_account_move_and_lines(session,
                                                                    move)
        for order in self:
            if order.company_id.anglo_saxon_accounting:
                grouped_data = res["grouped_data"]
                for group_key, group_data in grouped_data.items():
                    if group_key[0] == "counter_part":
                        # try to find additional move lines vals
                        for value in group_data:
                            if value["name"] != _("Trade Receivables"):
                                # need to get move line that contain COGS or Interim
                                value.update({
                                    "analytic_account_id": order.account_analytic_id.id or False,
                                })
        return res


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    account_analytic_id = fields.Many2one(
        comodel_name='account.analytic.account', string='Analytic Account',
        copy=False)
