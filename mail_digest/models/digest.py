# -*- coding: utf-8 -*-

import logging
import math
import pytz

from datetime import datetime, date
from dateutil.relativedelta import relativedelta

from odoo import api, fields, models, tools
from odoo.addons.base.models.ir_mail_server import MailDeliveryException
from odoo.exceptions import AccessError
from odoo.tools.float_utils import float_round

_logger = logging.getLogger(__name__)


class Digest(models.Model):
    _inherit = 'digest.digest'

    periodicity = fields.Selection(
        [
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly')
        ],
        string='Periodicity', default='daily', required=True)

    kpi_sales_departments = fields.Boolean('Sales Department')
    kpi_sales_departments_value = fields.Html(compute='_compute_kpi_sales_departments_value')

    def _compute_kpi_sales_departments_value(self):
        for record in self:
            record.kpi_sales_departments_value = ''

    def compute_kpis_actions(self, company, user):
        res = super(Digest, self).compute_kpis_actions(company, user)

        html = '<table style="width: 100%;border-spacing: 0; border-bottom: none; color: #000; line-height: 23px; text-align: left;"><tbody>'

        categories_count = self.env['product.category'].search_count([])
        categories = self.env['product.category'].search([])
        lines = self.env['pos.order.line'].search([])
        items_total = sum(lines.mapped('qty'))
        unit_volume = sum(lines.mapped('product_id.standard_price'))
        list_price_total = sum(lines.mapped('product_id.list_price'))
        margin_total = list_price_total - unit_volume
        net_sales_total = sum(lines.mapped('price_subtotal'))
        margin_percent_total = 0.0
        if net_sales_total:
            margin_percent_total = margin_total * 100 / net_sales_total


        html += '<tr><td><strong>Number of Departments listed</strong></td><td>{}</td><td><strong>Total Number of Items Sold</strong></td><td>{}</td></tr>'.format(
            categories_count, items_total)
        html += '<tr><td><strong>Average Unit Volume Per Dept.</strong></td><td>{:.3f}</td><td><strong>Total Unit Volume</strong></td><td>{:.3f}</td></tr>'.format(
            unit_volume / categories_count, unit_volume)
        html += '<tr><td><strong>Average Net $ Margin Per Dept.</strong></td><td>${:.2f}</td><td><strong>Total Net $ Margin</strong></td><td>${:.2f}</td></tr>'.format(
            margin_total / categories_count, margin_total)
        html += '<tr><td><strong>Average Net % Margin Per Dept.</strong></td><td>{:.2f}%</td><td><strong>Total Net % Margin</strong></td><td>{:.2f}%</td></tr>'.format(
            margin_percent_total, margin_percent_total)
        html += '<tr><td><strong>Average Net Sales Per Dept.</strong></td><td>${:.2f}</td><td><strong>Total Net Sales</strong></td><td>${:.2f}</td></tr>'.format(
            net_sales_total / categories_count, net_sales_total)

        html += '<tr><td></td><td></td><td></td><td></td></tr><tr></tr></tbody></table>'
        html += '<table style="width: 100%;border-spacing: 0; border-bottom: none; color: #000; line-height: 23px; text-align: left;"><thead style="color: #fff; background-color: #003466; text-align: left;"><tr><th>Department Name</th><th>Net Sales per Dept</th><th>% Net Sales of Total</th></tr></thead><tbody>'

        categories = self.env['product.category'].search([])
        lines = self.env['pos.order.line'].search([])
        total = sum(lines.mapped('price_subtotal'))
        for category in categories:
            price_total = 0
            price_total = sum(lines.filtered(lambda r: r.product_id.categ_id == category).mapped('price_subtotal'))
            percent = price_total * 100 / total
            html += '<tr><td>{}</td><td> ${:.2f} </td><td> {:.2f}% </td></tr>'.format(category.name, price_total,
                                                                                      percent)
        html += '<tr><td></td><td></td><td></td><td></td></tr>'
        html += '</tbody></table>'

        html += '<tr></tr><table style="width: 100%; border-spacing: 0; border-bottom: none; color: #000; line-height: 23px; text-align: left;">'
        html += '<thead style="color: #fff; background-color: #003466; text-align: left;"><tr><th>Department Name</th><th>Items Sold</th><th>Unit Volume</th><th>Ext. Cost</th><th>Net Sales</th><th>Net Margin</th><th>% Margin</th></tr></thead><tbody>'

        categories = self.env['product.category'].search([])
        lines = self.env['pos.order.line'].search([])
        total = sum(lines.mapped('price_subtotal'))
        for category in categories:
            price_total = 0
            items = sum(lines.filtered(lambda r: r.product_id.categ_id == category).mapped('qty'))
            cost_total = sum(
                lines.filtered(lambda r: r.product_id.categ_id == category).mapped('product_id.standard_price'))
            sales_total = sum(
                lines.filtered(lambda r: r.product_id.categ_id == category).mapped('product_id.list_price'))
            price_total = sum(lines.filtered(lambda r: r.product_id.categ_id == category).mapped('price_subtotal'))
            margin = sales_total - cost_total
            margin_percent = 0.0
            if price_total:
                margin_percent = margin * 100 / price_total
            html += '<tr><td>{}</td><td> {} </td><td> {:.3f} </td><td>  </td><td> ${:.2f} </td><td> ${:.2f} </td><td> {:.2f}% </td></tr>'.format(
                category.name, items, cost_total,
                # ' - ',
                price_total, margin,
                margin_percent)

        html += '</tbody></table>'

        res['kpi_sales_department'] = html
        return res

    def _get_next_run_date(self):
        self.ensure_one()
        if self.periodicity == 'daily':
            delta = relativedelta(days=1)
        if self.periodicity == 'weekly':
            delta = relativedelta(weeks=1)
        elif self.periodicity == 'monthly':
            delta = relativedelta(months=1)
        elif self.periodicity == 'quarterly':
            delta = relativedelta(months=3)
        return date.today() + delta
