# -*- coding: utf-8 -*-

from odoo import models, api


class ProductCategory(models.Model):
    """
    Inherit category class for change accounts(income or expense) in products
    with same category or not set income account or expense account
    """
    _inherit = 'product.category'

    @api.model
    def _prepare_change_accounts(self, vals={}):
        """
        Hook method to returns the different argument values for the
        products accounts.
        :param vals: dictionary with accounts
        :return: dictionary with category account values for products.
        """
        values = dict()
        if 'property_account_income_categ_id' in vals:
            values.update(
                {
                    'property_account_income_id': vals.get(
                        'property_account_income_categ_id'
                    )
                }
            )
        if 'property_account_expense_categ_id' in vals:
            values.update(
                {
                    'property_account_expense_id': vals.get(
                        'property_account_expense_categ_id'
                    )
                }
            )
        return values

    @api.multi
    def write(self, vals):
        """
        Redefine write function for update accounts in product.
        :param vals: dictionary with values to update
        :return: Boolean: True is success
        """
        res = super(ProductCategory, self).write(vals=vals)
        products = self.env['product.product'].search(
            [
                ('categ_id', '=', self.id),
                '|',
                ('property_account_income_id', '=', False),
                ('property_account_expense_id', '=', False),
            ]
        )
        products.write(self._prepare_change_accounts(vals=vals))
        return res

    @api.multi
    def apply_all_product(self):
        """
        Button function for set category accounts(expenses and incomes)
        to accounts products with this category.
        :return: True
        """
        for categ in self:
            if self.env.context.get('income', False):
                vals = {
                    'property_account_income_categ_id':
                        categ.property_account_income_categ_id,
                }
            if self.env.context.get('expense', False):
                vals = {
                    'property_account_expense_categ_id':
                        categ.property_account_expense_categ_id
                }
            products = self.env['product.product'].search(
                [
                    ('categ_id', '=', categ.id),
                ]
            )
            products.write(self._prepare_change_accounts(vals=vals))
        return True
