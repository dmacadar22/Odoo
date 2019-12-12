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
##############################################################################

from odoo import fields, models ,api, _


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    
    item_limit = fields.Integer('Item Limit', related='company_id.item_limit')
    price_history = fields.Selection([('confirm_order', 'Order Confirm'),
                                       ('done', 'Done(Locked)'),
                                       ('both', 'Both')],
                                       string='Price History Based On',
                                       related='company_id.price_history')
    

class ResCompany(models.Model):
    _inherit = "res.company"
    
    item_limit = fields.Integer('Item Limit')
    price_history = fields.Selection([('confirm_order', 'Order Confirm'),
                                       ('done', 'Done(Locked)'),
                                       ('both', 'Both')],
                                       string='Price History Based On')
   
    
    
    
    
    
    
    
    