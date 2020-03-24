# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _

class ReportAccountFinancialReport(models.Model):
    _inherit = "account.financial.html.report"

    @api.multi
    def _get_lines(self, options, line_id=None):
        res = super(ReportAccountFinancialReport, self)._get_lines(options, line_id)
        new_res = []
        list_of_accounts = []
        last = False
        for r in res:
            if r.get('caret_options', False) and r.get(
                    'caret_options') == 'account.account':
                list_of_accounts.append(r)
            else:
                list_of_dict = []
                if len(list_of_accounts) > 0:
                    list_of_dict = self.get_dict(list_of_accounts, last)
                    for dict in list_of_dict:
                        new_res.append(dict)
                new_res.append(r)
                list_of_accounts = []
                last = r
        return new_res

    def get_dict(self, list_of_accounts, last):
        """
        Function to calculate the hierarchical structure to show.
        :param list_of_accounts: list of dict with records to print
        :param last: dict with the last parent
        :return:
        """
        list_of_dict = []
        for account in list_of_accounts:
            parents_ids = self.get_recursive_parents(account, last)
            account_id = account.get('id', False)
            account_obj = self.env['account.account'].browse(account_id)

            if len(list_of_dict) == 0:
                list_of_dict = parents_ids
                account['class'] = 'o_js_account_report_inner_row o_account_reports_level_extended%d' \
                               % (account_obj.level + 1)
                list_of_dict.append(account)
            else:
                index = 0
                for pas in parents_ids:
                    index = 0
                    for lis in list_of_dict:
                        if pas.get('id') == lis.get('id'):
                            if len(account.get('columns')) == 1:
                                balance = lis.get('columns')[0]['no_format_name']
                                balance = balance + pas.get('columns')[0]['no_format_name']
                                columns = [
                                    {
                                        'name': self.format_value(balance),
                                        'no_format_name': balance
                                    }
                                ]
                                lis['columns'] = columns
                                break
                            else:
                                count = len(account.get('columns'))
                                index = 0
                                columns = []
                                while index < count:
                                    if account.get('columns')[index].get(
                                            'no_format_name', False):
                                        name = lis.get('columns')[index]['no_format_name']
                                        name = name + pas.get('columns')[index]['no_format_name']
                                        try:
                                            format_value = self.format_value(
                                                name)
                                        except Exception as e:
                                            format_value = self.format_value(
                                                0.00)
                                        val = {
                                            'name': format_value,
                                            'no_format_name': name
                                        }
                                    else:
                                        name = account.get('columns')[index].get(
                                            'name', False)
                                        if not name:
                                            name = 'n/a'
                                        val = {
                                            'name': name,
                                        }
                                    columns.append(val)
                                    index += 1
                        index += 1
                    if index == len(list_of_dict):
                        list_of_dict.append(pas)
                account['class'] = 'o_js_account_report_inner_row o_account_reports_level_extended%d' \
                                   % (account_obj.level + 1)
                list_of_dict.insert(index + 1, account)
        return list_of_dict

    def get_recursive_parents(self, account, last):
        """
        Function to get the parents of the account
        :param account: dict with data of account
        :param last: dict with the last parent
        :return: list of dict with the parents of account
        """
        account_id = account.get('id', False)
        account_obj = self.env['account.account'].browse(account_id)
        parents = []
        while account_obj.parent_id:
            if len(account.get('columns')) == 1:
                if account.get('columns')[0].get('no_format_name', False):
                    name = account.get('columns')[0]['no_format_name']
                else:
                    name = account.get('columns')[0]['name']
                columns = [{
                        'name': self.format_value(name),
                        'no_format_name': name
                        }
                ]
            else:
                count = len(account.get('columns'))
                index = 0
                columns = []
                while index < count:
                    if account.get('columns')[index].get(
                            'no_format_name', False):
                        if account.get('columns')[index].get('no_format_name', False):
                            name = account.get('columns')[index]['no_format_name']
                        else:
                            name = account.get('columns')[index]['name']
                        try:
                            format_value = self.format_value(name)
                        except Exception as e:
                            format_value = self.format_value(0.00)
                        val = {
                            'name': format_value,
                            'no_format_name': name
                        }
                    else:
                        name = account.get('columns')[index].get(
                            'name', False)
                        if not name:
                            name = 'n/a'
                        val = {
                            'name': name,
                        }

                    columns.append(val)
                    index += 1

            parent = {
                'id': account_obj.parent_id.id,
                'name': account_obj.parent_id.display_name,
                'class': 'o_account_reports_domain_total o_account_reports_totals_below_sections  o_js_account_report_inner_row',
                'columns': columns,
                'level': account_obj.parent_id.level + 3,
                'parent_id': last.get('id'),
                'unfoldable': False,
                'unfolded': False,
                'page_break': False
            }
            parents.append(parent)
            account_obj = account_obj.parent_id
        parents.reverse()
        return parents