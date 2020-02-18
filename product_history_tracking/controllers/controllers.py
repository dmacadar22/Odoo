# -*- coding: utf-8 -*-
from odoo import http

# class ProductHistoryTracking(http.Controller):
#     @http.route('/product_history_tracking/product_history_tracking/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/product_history_tracking/product_history_tracking/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('product_history_tracking.listing', {
#             'root': '/product_history_tracking/product_history_tracking',
#             'objects': http.request.env['product_history_tracking.product_history_tracking'].search([]),
#         })

#     @http.route('/product_history_tracking/product_history_tracking/objects/<model("product_history_tracking.product_history_tracking"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('product_history_tracking.object', {
#             'object': obj
#         })