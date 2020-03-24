# -*- coding: utf-8 -*-
###############################################################################
#    License, author and contributors information in:                         #
#    __manifest__.py file at the root folder of this module.                  #
###############################################################################

import base64
import xlrd
from io import StringIO

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class ImportProductWizard(models.TransientModel):
    _name = 'import.product.wizard'

    data = fields.Binary(string='Products File', required=True)
    filename = fields.Char()

    @api.multi
    def do_import_products(self):
        this = self[0]
        decoded_data = base64.decodestring(this.data)
        book = xlrd.open_workbook(file_contents=decoded_data)
        return this._read_xls_book(book)

    @api.model
    def _read_xls_book(self, book):
        sheet = book.sheet_by_index(0)
        # items = [(5, )]
        for row in range(1, sheet.nrows):

            product_obj = None
            vals = {
                'applied_on': '1_product',
                'pricelist_id': self._context.get('active_id')
            }

            for col in range(0, sheet.ncols):
                cell = sheet.cell_value(row, col)
                if col == 0:
                    if type(cell) == float:
                        cell = str(sheet.cell_value(row, col)).split('.')[0]

                    product_obj = self.env['product.template'].search(
                        [('barcode', '=', cell)], limit=1)

                if product_obj.exists():
                    vals['product_tmpl_id'] = product_obj.id

                    if col == 1:
                        if cell == 'p':
                            compute_price = 'percentage'
                        else:
                            compute_price = 'fixed'
                        vals['compute_price'] = compute_price

                    elif col == 2:
                        if compute_price == 'percentage':
                            percent_price = cell
                            vals['percent_price'] = percent_price
                        else:
                            fixed_price = cell
                            vals['fixed_price'] = fixed_price
                    elif col == 3:
                        date_start = xlrd.xldate.xldate_as_datetime(
                            int(cell), book.datemode)
                        vals['date_start'] = date_start
                    elif col == 4:
                        date_end = xlrd.xldate.xldate_as_datetime(
                            int(cell), book.datemode)
                        vals['date_end'] = date_end

            if product_obj.exists():
                print(vals, )
                self.env['product.pricelist.item'].create(vals)
