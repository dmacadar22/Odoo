odoo.define('pos_geniusfund.genius-customer-orders', function (require) {
"use strict";
    
    //Try massive requirements - as in vouchers_pos module
    var core = require('web.core');
    var screens = require('point_of_sale.screens');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var pos_model = require('point_of_sale.models');
    var pos_popup = require('point_of_sale.popups');
    var gui = require('point_of_sale.gui');
    var ScreenWidget = screens.ScreenWidget;
    var models = pos_model.PosModel.prototype.models;
    var PosModelSuper = pos_model.PosModel;
    var OrderSuper = pos_model.Order;
    var rpc = require('web.rpc');
    var core = require('web.core');
    var _t = core._t;
    var utils = require('web.utils');
    var round_pr = utils.round_precision;    
    var QWeb = core.qweb;
    var chrome = require('point_of_sale.chrome');

    /* Screen for the customer orders */   
    var ScreenCustomerOrders = ScreenWidget.extend({
        
        template:'ScreenCustomerOrders',
        
        init: function(parent,options){
            this._super(parent,options);
            this.hidden = false;
        },
        
        show: function(){
            var self = this;
            this._super();
            this.renderElement();
            this.$('.back').click(function(){
                self.gui.back();
            });
            var orders = this.pos.orders;
            this.render_list(orders);
            var search_timeout = null;
            this.$('.searchbox input').on('keypress',function(event){
                clearTimeout(search_timeout);
                var searchbox = this;
                search_timeout = setTimeout(function(){
                    self.perform_search(searchbox.value, event.which === 13);
                },70);
            });
            this.$('.searchbox .search-clear').click(function(){
                self.clear_search();
            });
            this.$('.customer_order').click(function(e){
                var order_id = $(e.target).closest("tr").data('id');
                self.render_customer_order_line(order_id);
                $(".customer_order").removeClass('selected');
                $(this).addClass('selected');
            });
        },
        hide: function () {
            this._super();
        },
        get_orders: function(){
            return this.gui.get_current_screen_param('orders');
        },
        perform_search: function(query, associate_result){
            var orders;
            if(query){
                orders = this.search_order(query);
                this.render_list(orders);
            }else{
                this.clear_search();
            }
        },
        search_order: function(query){
            try {
                var re = RegExp(query, 'i');
            }catch(e){
                return [];
            }
            var results = [];
            for (var order_id in this.pos.orders){
                var r = re.exec(this.pos.orders[order_id]['pos_reference']+ '|'+ this.pos.orders[order_id]['partner_id'][1]);
                if(r){
                    results.push(this.pos.orders[order_id]);
                }
            }
            return results;
        },
        clear_search: function(){
            var orders = this.pos.orders;
            this.render_list(orders);
            this.$('.searchbox input')[0].value = '';
            this.$('.searchbox input').focus();
        },
        render_list: function(orders){
            var client = this.pos.get('selectedClient');
            var customerOrders = orders.filter(function (orders_array){
                return orders_array.partner_id[0] == client.id;
            });
            var contents = this.$el[0].querySelector('.order-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(customerOrders.length,1000); i < len; i++){
                var order    = customerOrders[i];
                order.formated_date = get_formated_date(order.date_order);
                order.formated_hour = get_formated_hour(order.date_order);
                var orders_html = QWeb.render('CustomerOrders',{widget: this, order:order});
                var orders = document.createElement('tbody');
                orders.innerHTML = orders_html;
                orders = orders.childNodes[1];
                contents.appendChild(orders);
            }            
        },
        render_customer_order_line:function(options){

            $("#customer-orderlines").empty();
            var lines = [];
            console.log('options:', options);
            this.pos_reference = options;
            rpc.query({
                model: 'pos.order',
                method: 'get_lines',
                args: [options],
            }).then(function (result) {
                $("#customer-orderlines").empty();
                lines = result[0];
                for(var j=0;j < lines.length; j++){
                    var product_line = lines[j];
                    var rows = "";
                    var image_url = window.location.origin + '/web/image?model=product.product&field=image_small&id='+product_line.product_id;
                    var total_line = product_line.qty * product_line.price_unit;
                    if (j==0){
                        rows += "<div class='table-row table-header'><div>Product name</div><div></div><div>Price/Unit</div><div>Discount</div><div>Quantity</div><div>Total</div></div>";
                    }
                    rows += "<div class='table-content-row'>";
                    rows += "<div class='line-cell'><img src='" + image_url + "'/></div>";
                    rows += "<div class='line-cell'>" + product_line.product +" </div>";
                    rows += "<div class='line-cell txt-right'>" + product_line.price_unit + "</div>";
                    rows += "<div class='line-cell txt-right'>" + product_line.discount + "</div>";
                    rows += "<div class='line-cell txt-right'>" + product_line.qty + "</div>";
                    rows += "<div class='line-cell txt-right'>" + total_line + "</div>";
                    rows += "</div class='line-cell'>";
                    $(rows).appendTo("#customer-orderlines");
                }
            }).fail(function () {
                alert("NO DATA")
            });
            
        },
        get_order_by_id: function(id){
            var orders = this.pos.orders;
            for (var i in orders){
                if (orders[i].id === id){
                    return orders[i];
                }
            }

        }
    });
    gui.define_screen({name: 'ScreenCustomerOrders', widget: ScreenCustomerOrders});    

    return {
        ScreenCustomerOrders: ScreenCustomerOrders,
    };
    
});
