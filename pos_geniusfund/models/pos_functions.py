# -*- coding: utf-8 -*-
from odoo import api, fields, models
from datetime import datetime, timedelta


class CapPosGeniusFunctions(models.Model):
    _name = 'pos.genius.functions'

    @api.model
    def pos_notes_popup(self, note, customer):
        customer_id = customer['id']
        customer_flag = customer['flag']


        customer = self.env['res.partner'].search([('id', '=', customer_id)])
        customer_previous_note = customer.pos_note

        # Save flag state / note
        customer = self.env['res.partner'].browse(customer_id)
        customer.write({'flag': customer_flag})
        customer.write({'pos_note': note})

        # Add new note for auditing changes
        if customer_previous_note != note:
            user_id = self.env['res.users'].search([('id', '=', self.env.uid)])
            author_id = False
            if user_id:
                author_id = self.env['res.partner'].search([('id', '=', user_id.partner_id.id)])
            if customer:
                if author_id:
                    customer.sudo().message_post(body=note, author_id=author_id.id)
                else:
                    customer.sudo().message_post(body=note)

        return True

    @api.model
    def find_notes_popup(self, ui_customer):
        customer_id = ui_customer['client']['id']

        customer = self.env['res.partner'].browse(customer_id)

        return customer.pos_note
