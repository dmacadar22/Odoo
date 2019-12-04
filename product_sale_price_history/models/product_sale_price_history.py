# -*- coding: utf-8 -*-
##############################################################################
#
#    Globalteckz Pvt Ltd
#    Copyright (C) 2013-Today(www.globalteckz.com).
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################

from odoo import fields, models ,api, _ 

class ProductTemplate(models.Model):
    _inherit='product.template'
    
    product_product_ids = fields.One2many("price.history", 'product_id', string='Sales Price History')
    
class Product(models.Model):
    _inherit='product.product'
      
    product_ids = fields.One2many("price.history", 'product_id', string='Sales Price History')
        
class ProductSalePriceHistory(models.Model):
    _name='price.history'
    
    product_id = fields.Many2one('product.product', string='Product')
    customer = fields.Many2one('res.partner', string='Customer')
    user_id = fields.Many2one('res.users', string='Sales Person')
    order_name = fields.Char(string='Sale Order')
    order_date = fields.Datetime(string='Order Date')
    quantity = fields.Integer('Quantity')
    price_unit = fields.Float('Unit Price')
    total = fields.Float('Total')
    
class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'
   
    product_id = fields.Many2one('product.template', string='Product', domain=[('sale_ok', '=', True)], change_default=True, ondelete='restrict', required=True)


class Company(models.Model):
    _inherit = 'res.company'  
    
    price_history = fields.Selection([
    ('confirm_order', 'Order Confirm'),
    ('done', 'Done(Locked)'),
    ('both', 'Both'),
    ], string="Purchase Order Modification")
    
class ProductCron(models.Model):
    _name='product.cron'
    
    @api.model
    def cron_product_template_price_history(self):
        int = 1
        products = self.env['product.template'].search([])
        for product in products:
#             product._cr.execute("delete from price_history where product_id =  %s" %(product.id))
            sale_order_line_obj = self.env['sale.order.line'].search([('product_id', '=', product.id)])
            ids=[]
            price_history_obj = self.env['price.history']
            for sales in sale_order_line_obj:
                if sales.product_id == product and product.company_id.price_history == 'confirm_order' and sales.order_id.state =='sale' and int <= product.company_id.item_limit:
                    products_dic = {
                                'customer' : sales.order_id.partner_id.id,
                                'order_date' : sales.order_id.date_order,
                                'product_id' : product.id,
                                'quantity' : sales.product_uom_qty,
                                'price_unit' : sales.price_unit,
                                'total' : sales.price_total,
                                'user_id' : sales.order_id.user_id.id,
                                'order_name' : sales.order_id.name
                                }
                    price_history_rec = price_history_obj.create(products_dic)
                    ids.append(price_history_rec.id)
                    int += 1
                elif sales.product_id == product and product.company_id.price_history == 'done' and sales.order_id.state =='done' and int <= product.company_id.item_limit:
                    products_dic = {
                                'customer' : sales.order_id.partner_id.id,
                                'order_date' : sales.order_id.date_order,
                                'product_id' : product.id,
                                'quantity' : sales.product_uom_qty,
                                'price_unit' : sales.price_unit,
                                'total' : sales.price_total,
                                'user_id' : sales.order_id.user_id.id,
                                'order_name' : sales.order_id.name
                                }
                    price_history_rec = price_history_obj.create(products_dic)
                    ids.append(price_history_rec.id)
                    int += 1
                elif sales.product_id == product and product.company_id.price_history == 'both' and sales.order_id.state in ('sale','done') and int <= product.company_id.item_limit:
                    products_dic = {
                                'customer' : sales.order_id.partner_id.id,
                                'order_date' : sales.order_id.date_order,
                                'product_id' : product.id,
                                'quantity' : sales.product_uom_qty,
                                'price_unit' : sales.price_unit,
                                'total' : sales.price_total,
                                'user_id' : sales.order_id.user_id.id,
                                'order_name' : sales.order_id.name
                                }
                    price_history_rec = price_history_obj.create(products_dic)
                    ids.append(price_history_rec.id)
                    int += 1
            product.product_product_ids = ids
            
    @api.model
    def cron_product_price_sale_history(self):
        
        int = 1
        products = self.env['product.product'].search([])
        for product in products:
#             product._cr.execute("delete from price_history where product_id =  %s" %(product.id))
            sale_order_line_obj = self.env['sale.order.line'].search([('product_id', '=', product.id)])
            ids=[]
            price_history_obj = self.env['price.history']
            for sales in sale_order_line_obj:
                if sales.product_id == product and product.company_id.price_history == 'confirm_order' and sales.order_id.state =='sale' and int <= product.company_id.item_limit:
                    products_dic = {
                                'customer' : sales.order_id.partner_id.id,
                                'order_date' : sales.order_id.date_order,
                                'product_id' : product.id,
                                'quantity' : sales.product_uom_qty,
                                'price_unit' : sales.price_unit,
                                'total' : sales.price_total,
                                'user_id' : sales.order_id.user_id.id,
                                'order_name' : sales.order_id.name
                                }
                    price_history_rec = price_history_obj.create(products_dic)
                    ids.append(price_history_rec.id)
                    int += 1
                elif sales.product_id == product and product.company_id.price_history == 'done' and sales.order_id.state =='done' and int <= product.company_id.item_limit:
                    products_dic = {
                                'customer' : sales.order_id.partner_id.id,
                                'order_date' : sales.order_id.date_order,
                                'product_id' : product.id,
                                'quantity' : sales.product_uom_qty,
                                'price_unit' : sales.price_unit,
                                'total' : sales.price_total,
                                'user_id' : sales.order_id.user_id.id,
                                'order_name' : sales.order_id.name
                                }
                    price_history_rec = price_history_obj.create(products_dic)
                    ids.append(price_history_rec.id)
                    int += 1
                elif sales.product_id == product and product.company_id.price_history == 'both' and sales.order_id.state in ('sale','done') and int <= product.company_id.item_limit:
                    products_dic = {
                                'customer' : sales.order_id.partner_id.id,
                                'order_date' : sales.order_id.date_order,
                                'product_id' : product.id,
                                'quantity' : sales.product_uom_qty,
                                'price_unit' : sales.price_unit,
                                'total' : sales.price_total,
                                'user_id' : sales.order_id.user_id.id,
                                'order_name' : sales.order_id.name
                                }
                    price_history_rec = price_history_obj.create(products_dic)
                    ids.append(price_history_rec.id)
                    int += 1
            product.product_ids = ids
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
            
        