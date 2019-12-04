# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from datetime import datetime
from odoo import api, fields, models, tools, _
import odoo.addons.decimal_precision as dp

class product_product_price(models.Model):
	_name = "product.product.price"
	_description = "Product Price"
	_order = "id desc" 

	@api.model
	def create(self,vals):
		if not vals.get('date_ext'):
			today_date = datetime.now()
			vals['date_ext'] = today_date
		return super(product_product_price, self).create(vals)

	product_id = fields.Many2one('product.product', 'Product')
	partner_id = fields.Many2one('res.partner', 'Supplier Name')
	old_price =  fields.Float('Old Price', digits_compute=dp.get_precision('Old Price'))
	new_price =  fields.Float('New Price', digits_compute=dp.get_precision('New Price'))
	date_ext = fields.Date("Modified Date", readonly=True)


class purchase_product_price(models.Model):
	_name = "purchase.product.price"
	_description = "Purchase Price"
	_order = "id desc" 

	@api.model
	def create(self,vals):
		if not vals.get('date_ext'):
			today_date = datetime.now()
			vals['date_ext'] = today_date
		return super(purchase_product_price, self).create(vals)

	product_id = fields.Many2one('product.product', 'Product')
	partner_id = fields.Many2one('res.partner', 'Vendor Name')
	old_price =  fields.Float('Old Price', digits_compute=dp.get_precision('Old Price'))
	new_price =  fields.Float('New Price', digits_compute=dp.get_precision('New Price'))
	date_ext = fields.Date("Modified Date", readonly=True)

class product_price(models.Model):
	_name = "product.price"
	_description = "Product Price"
	_order = "id desc" 

	@api.model
	def create(self,vals):
		if not vals.get('date_ext'):
			today_date = datetime.now()
			vals['date_ext'] = today_date
		return super(product_price, self).create(vals)

	product_id = fields.Many2one('product.product', 'Product')
	old_price =  fields.Float('Old Price', digits_compute=dp.get_precision('Old Price'))
	new_price =  fields.Float('New Price', digits_compute=dp.get_precision('New Price'))
	date_ext = fields.Date("Modified Date", readonly=True)


class product_product(models.Model):
	_inherit = 'product.product'

	@api.multi
	def write(self,vals):
		oldprice = self.standard_price
		res = super(product_product,self).write(vals)
		price_line = {}
		product_price = self.env['product.price']
		
		if self.standard_price != oldprice:
			product_price.create({
            	'product_id': self.id,
                'old_price' : oldprice,
                'new_price' : self.standard_price,
            })
			self.write({'standard_price':self.standard_price})
		return res

	product_price_ids = fields.One2many('product.product.price', 'product_id','Price',readonly=True)
	purchase_product_price_ids = fields.One2many('purchase.product.price','product_id','Price',readonly=True)
	price_product_id = fields.One2many('product.price','product_id','Price',readonly=True)

class account_invoice_line(models.Model):
	_inherit = 'account.invoice.line'

	@api.model
	def create(self,vals):
		res = super(account_invoice_line, self).create(vals)
		product_obj = self.env['product.product']
		product_price = self.env['product.product.price']
		if self._context.get('type') == 'in_invoice':
			if vals.get('product_id'):
				product = vals.get('product_id')
				oldprice = product_obj.browse(product).standard_price
				newprice = vals.get('price_unit')
				price_line = {
	                'product_id': product,
	                'old_price' : oldprice,
	                'new_price' : newprice,
	                'partner_id': res.invoice_id.partner_id and res.invoice_id.partner_id.id or False,
	            }
				if vals.get('price_unit') != oldprice:
					product_price.create(price_line)
					product_obj.browse(product).write({'standard_price': vals.get('price_unit')})
		return res


	@api.multi
	def write(self,vals):
		res = super(account_invoice_line, self).write(vals)
		price_line = {}
		if self._context.get('type') == 'in_invoice':
			for line_product in self:
				oldprice = line_product.product_id.standard_price
				product_price = self.env['product.product.price']
				if line_product.product_id and vals.get('price_unit'):
					newprice = vals.get('price_unit')
					price_line = {
	                    'product_id': line_product.product_id.id,
	                    'old_price' : oldprice,
	                    'new_price' : newprice,
	                    'partner_id': line_product.invoice_id.partner_id and line_product.invoice_id.partner_id.id or False,
	                }
				if vals.get('price_unit') != oldprice:
					product_price.create(price_line)
					line_product.product_id.write({'standard_price': vals.get('price_unit')})
			return res

class purchase_order_line(models.Model):
	_inherit = 'purchase.order.line'

	@api.model
	def create(self,vals):
		res = super(purchase_order_line, self).create(vals)
		product_obj = self.env['product.product']
		purchase_price = self.env['purchase.product.price']
		if vals.get('product_id'):
			product = vals.get('product_id')
			oldprice = product_obj.browse(product).standard_price
			newprice = vals.get('price_unit')
			price_line = {
                'product_id': product,
                'old_price' : oldprice,
                'new_price' : newprice,
                'partner_id': res.order_id.partner_id and res.order_id.partner_id.id or False,
            }
			if vals.get('price_unit') != oldprice:
				purchase_price.create(price_line)
				product_obj.browse(product).write({'standard_price': vals.get('price_unit')})
		return res


	@api.multi
	def write(self,vals):
		res = super(purchase_order_line, self).write(vals)
		price_line = {}
		for line_product in self:
			oldprice = line_product.product_id.standard_price
			purchase_price = self.env['purchase.product.price']
			if line_product.product_id and vals.get('price_unit'):
				newprice = vals.get('price_unit')
				price_line = {
                    'product_id': line_product.product_id.id,
                    'old_price' : oldprice,
                    'new_price' : newprice,
                    'partner_id': line_product.order_id.partner_id and line_product.order_id.partner_id.id or False,
                }
			if vals.get('price_unit') != oldprice:
				purchase_price.create(price_line)
				line_product.product_id.write({'standard_price': vals.get('price_unit')})
		return res