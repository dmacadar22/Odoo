odoo.define('pos_logo_barcode_receipt.pos_logo_barcode_receipt', function (require) {
"use strict";

    var core = require('web.core');
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var devices = require('point_of_sale.devices');
    var QWeb = core.qweb;
    var _t = core._t;
    
    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options) {
            var self = this;
            this.set({
                'pos_reference' : false
            });
            _super_order.initialize.apply(this,arguments);
        },
        export_for_printing: function(){
            var json = _super_order.export_for_printing.apply(this,arguments);
            var barcode_val = this.get_name();
            var barcode_src = false;
            if(this.get_pos_reference()){
                barcode_val = this.get_pos_reference();
            }
            if (barcode_val) {
                var barcodeTemplate = QWeb.render('templatebarcode',{
                      widget: self,barcode : barcode_val
                });
                $(barcodeTemplate).find('#xml_receipt_barcode').barcode(barcode_val.toString(), "code128");
                if(_.isElement($(barcodeTemplate).find('#xml_receipt_barcode').barcode(barcode_val.toString(), "code128")[0])){
                    if($(barcodeTemplate).find('#xml_receipt_barcode').barcode(barcode_val.toString(), "code128")[0].firstChild != undefined 
                            && $(barcodeTemplate).find('#xml_receipt_barcode').barcode(barcode_val.toString(), "code128")[0].firstChild.data != undefined){
                        barcode_src = $(barcodeTemplate).find('#xml_receipt_barcode').barcode(barcode_val.toString(), "code128")[0].firstChild.data;
                    }
                }
            }
            json.barcode_src = barcode_src;
            return json;
        },
        set_pos_reference: function(pos_reference) {
            this.set('pos_reference', pos_reference)
        },
        get_pos_reference: function() {
            return this.get('pos_reference')
        },
    });
    
    screens.ReceiptScreenWidget.include({
        show: function(){
            this._super();
            var order = this.pos.get_order();
            /* Set barcode in pos ticket. */
            var barcode_val = order.get_name();
            if(order.get_pos_reference()){
                barcode_val = order.get_pos_reference();
            }
            /* [MMA] Remove "Order " from barcode_val because barcode is to long and can't be read anymore */
            var new_barcode_val = barcode_val.replace("Order", "").trim();
            if (new_barcode_val) {
               $("#barcode_div").addClass(new_barcode_val.toString());
               $("#barcode_div").barcode(new_barcode_val.toString(), "code128"); //code128 by default
            }
        },
    });

});