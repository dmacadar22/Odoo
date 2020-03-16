odoo.define('pos_return.pos_return', function (require) {
"use strict";

	var core = require('web.core');
	var utils = require('web.utils');
	var rpc = require('web.rpc');
	var PosBaseWidget = require('point_of_sale.BaseWidget');
	var screens = require('point_of_sale.screens');
	var gui = require('point_of_sale.gui');
	var chrome = require('point_of_sale.chrome');
	var models = require('point_of_sale.models');
	var PopupWidget = require('point_of_sale.popups');

	var _t = core._t;
	var QWeb = core.qweb;
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;

//    For Showing the Returns Button in POS Screen
    var ListOrderreturnWidget = PosBaseWidget.extend({
        template: 'ListOrderreturnWidget',
        init: function (parent, options) {
            var opts = options || {};
            this._super(parent, opts);
            this.action = opts.action;
            this.label = opts.label;
        },
    })
//    Pop up Screen For listing the Orders
    var PosReturnOrderList = PopupWidget.extend({
        template: 'PosReturnOrderList',
        init: function(parent, args) {
	    	var self = this;
	        this._super(parent, args);
	        this.options = {};
	        this.line = [];
	    },
//       Events for Search(Keyup and focus)
	    events: {
            'keyup .searchbox input':  'search_orderlist',
            'focus .searchbox input': 'search_orderlistfocus',
            'click .cancel_new' : 'click_cancel_close',
        },
        click_cancel_close: function(){
	    	this.gui.close_popup();
            this.pos.get('selectedOrder').set_ret_o_id('');
            this.pos.get('selectedOrder').destroy();
            $('#return_order_ref').html('');
            $('#return_order_number').val('');
            $("span.remaining-qty-tag").css('display', 'none');
	    },

//        Open the Keyborad on focus
        search_orderlistfocus:function(){
            var self = this
            if (self.pos.config.iface_vkeyboard &&
                self.chrome.widget.keyboard) {
                self.chrome.widget.keyboard.connect(
                    self.$('.searchbox input'));
            }
        },
//        Search the Order on Keypress
        search_orderlist: function(){
            var self = this
            var search_timeout = null;
            this.search_query = $("#search_string").val();
            clearTimeout(search_timeout);
            search_timeout = setTimeout(function () {
              self.perform_search();
            }, 70);
            self.$('.searchbox .search-clear').click(function () {
              //  self.clear_search();
            });
        },
        search_done_orders: function (query) {
            var self = this;
            return this._rpc({
                model: 'pos.order',
                method: 'search_done_orders_for_pos',
                args: [query || '', this.pos.pos_session.id],

            }).then(function (result) {
                self.orders = result;
                var contents;
                var orders = []
                contents = self.$el[0].querySelector('.ac_product_list');
                contents.innerHTML = ''
                $('.ac_product_list').append("<div style='width:100%;display:inline-block;'><div style='border:1px solid #ccc;width:90%;display:block;margin:0px auto;'><div style='padding: 1px 3px 1px 5px;display:inline-block;width:100%;'><div class='' style='cursor:pointer;'><div style='width:25%;float:left;'><p class='order_pos_reference' style='margin:0px;font-size: 16px;line-height: 40px;'><span class=order_pos_ref'>Ref.</span></p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'><span>Customer</span></p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'>Date</p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'>Amount</p></div></div></div></div></div>")
                _.each(self.orders, function (order) {
                    if($(order)[0]['partner_id'])
                    {
                        $('.ac_product_list').append("<div style='width:100%;display:inline-block;'><div style='width:90%;display:block;margin:0px auto;'><div class='order_reference' style='cursor:pointer;'><div style='width:25%;float:left;'><p class='order_pos_reference' style='margin:0px;font-size: 16px;line-height: 40px;'><span class='order_pos_ref'>"+ $(order)[0]['pos_reference'] +"</span></p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'><span>"+$(order)[0]['partner_id']+"</span></p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'>"+$(order)[0]['date_order']+"</p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'>"+self.format_currency($(order)[0]['amount_total'])+"</p></div></div></div></div>")
                    }
                    else
                    {
                        $('.ac_product_list').append("<div style='width:100%;display:inline-block;'><div style='width:90%;display:block;margin:0px auto;'><div class='order_reference' style='cursor:pointer;'><div style='width:25%;float:left;'><p class='order_pos_reference' style='margin:0px;font-size: 16px;line-height: 40px;'><span class='order_pos_ref'>"+ $(order)[0]['pos_reference'] +"</span></p></div><div style='width:25%;float:left;'><p style='font-size: 16px;line-height: 40px;'><span></span></p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'>"+$(order)[0]['date_order']+"</p></div><div style='width:25%;float:left;'><p style='margin:0px;font-size: 16px;line-height: 40px;'>"+self.format_currency($(order)[0]['amount_total'])+"</p></div></div></div></div>")
                    }
                });
                var order_pos_ref = $(".order_reference")
                if($(order_pos_ref).length)
                    {

                        $(".order_reference").click(function(){
                        var close_button = $(".close_button")
                            if($(close_button).length)
                            {
                                $(".keyboard_frame").css("display","none")
                            }
                            var order_ref = $(this).find(".order_pos_ref").text();
                            if(order_ref.length)
                            {
                                self.gui.show_popup('pos_return_order');
                                var order_ref_val = $("#return_order_number").val(order_ref)
                                if($(order_ref_val).length)
                                {
                                    var e = $.Event( "keypress", { which: 13 } );
                                    $('#return_order_number').trigger(e);
                                }
                            }
                        })
                    }
                var search_res = $("#search_string").val()
            }).fail(function (error, event) {
                if (parseInt(error.code, 10) === 200) {
                    // Business Logic Error, not a connection problem
                    self.gui.show_popup(
                        'error-traceback', {
                            'title': error.data.message,
                            'body': error.data.debug,
                        }
                    );
                } else {
                    self.gui.show_popup('error', {
                        'title': _t('Connection error'),
                        'body': _t(
                            'Can not execute this action because the POS' +
                            ' is currently offline'),
                    });
                }
                event.preventDefault();
            });
        },
        perform_search: function () {
            var self = this;
            return this.search_done_orders(self.search_query)
                .done(function () {
                });

        },
        click_cancel: function(){
	    	this.gui.close_popup();
            this.pos.get('selectedOrder').set_ret_o_id('');
            this.pos.get('selectedOrder').destroy();
            $('#return_order_ref').html('');
            $('#return_order_number').val('');
            $("span.remaining-qty-tag").css('display', 'none');
	    },

    })
//    Load the Products for return and Scrap Qty based on Order
    var PosReturnOrder = PopupWidget.extend({
	    template: 'PosReturnOrder',
	    init: function(parent, args) {
	    	var self = this;
	        this._super(parent, args);
	        this.options = {};
	        this.line = [];
	        this.update_return_product_qty = function(ev){
	        	ev.preventDefault();
	            var $link = $(ev.currentTarget);
	            var $input = $link.parent().parent().find("input");
	            var product_elem = $('.product_content[data-line-id="'+$input.attr("name")+'"]')
	            if(!product_elem.hasClass('select_item')){
	            	product_elem.addClass('select_item')
	            }
	            var min = parseFloat($input.data("min") || 0);
	            var max = parseFloat($input.data("max") || $input.val());
	            var total_qty = parseFloat($input.data("total-qty") || 0);
	            var quantity = ($link.has(".fa-minus").length ? -1 : 1) + parseFloat($input.val(),10);
	            $input.val(quantity > min ? (quantity < max ? quantity : max) : min);
	            var $scrap_input = $('input.scrap_product_qty[name="'+$input.attr("name")+'"]');
	            $scrap_input.data('max', total_qty - $input.val());
	            $scrap_input.change();
	            $input.change();
	            return false;
	        };
	        this.update_scrap_product_qty = function(ev){
	        	ev.preventDefault();
	            var $link = $(ev.currentTarget);
	            var $input = $link.parent().parent().find("input");
	            var product_elem = $('.product_content[data-line-id="'+$input.attr("name")+'"]')
	            if(!product_elem.hasClass('select_item')){
	            	product_elem.addClass('select_item')
	            }
	            var min = parseFloat($input.data("min") || 0);
	            var max = parseFloat($input.data("max") || $input.val());
	            var total_qty = parseFloat($input.data("total-qty") || 0);
	            var quantity = ($link.has(".fa-minus").length ? -1 : 1) + parseFloat($input.val(),10);
	            $input.val(quantity > min ? (quantity < max ? quantity : max) : min);
	            var $return_input = $('input.return_product_qty[name="'+$input.attr("name")+'"]');
	            $return_input.data('max', total_qty - $input.val());
	            $return_input.change();
	            $input.change();
	            return false;
	        };
	        this.select_item = function(e){
	        	self.selected_item($(this).parent());
	        };
	        this.keypress_order_number = function(e){
	        	if(e.which === 13){
	        		var selectedOrder = self.pos.get_order();
	        		var ret_o_ref = $("input#return_order_number").val();
	        		if (ret_o_ref.indexOf('Order') == -1) {
	                    ret_o_ref = _t('Order ') + ret_o_ref.toString();
	                }
	        		if (ret_o_ref.length > 0) {
	        		    var params = {
	        		        model: 'pos.order',
                            method: 'search_read',
                            domain: [['pos_reference', '=', ret_o_ref]],
                            fields: ['id', 'pos_reference', 'partner_id'],
	        		    }
	        		    rpc.query(params, {async: false}).then(function(result) {
	        		        if (result && result.length > 0) {
                        		selectedOrder.set_ret_o_id(result[0].id);
                                selectedOrder.set_ret_o_ref(result[0].pos_reference);
                        		rpc.query({
                        		    model: "pos.order.line",
                        		    method: "search_read",
                        		    domain: [['order_id', '=', result[0].id],['return_qty', '>', 0]]
                        		},{async: false}).then(function(res) {
                                	if(res && res.length > 0){
	                                	var lines = [];
	                                    _.each(res,function(r) {
	                                    	lines.push(r);
	                                    	self.line[r.id] = r;
	                                    });
	                                    self.lines = lines;
	                                    self.renderElement();
                                	} else {
                                		alert(_t("This order has already been fully returned."));
                                		self.gui.close_popup();
                                        $("span#return_order").trigger('click')
                                	}
                                });
                        	} else {
                        		alert(_t("This order has already been fully returned."));
                        	}
                        }).fail(function(error, event) {
                            if (error.code === -32098) {
                                alert("Server closed...");
                                event.preventDefault();
                            }
                        });
	        		}
	        	}
	        };
	        this.keydown_qty = function(e){
	        	var opp_elem;
	        	var product_elem = $('.product_content[data-line-id="'+$(e.currentTarget).attr("name")+'"]')
	            if(!product_elem.hasClass('select_item')){
	            	product_elem.addClass('select_item')
	            }
	        	if($(e.currentTarget).hasClass('return_product_qty')){
	        		opp_elem = $('.scrap_product_qty[name="'+ $(e.currentTarget).attr('name') +'"]');
	        	} else if($(e.currentTarget).hasClass('scrap_product_qty')){
	        		opp_elem = $('.return_product_qty[name="'+ $(e.currentTarget).attr('name') +'"]');
	        	}
	        	var total_qty = $(e.currentTarget).data('total-qty');
	        	$(opp_elem).data('max', total_qty - $(e.currentTarget).val());
	        	if((!$.isNumeric($(e.currentTarget).val())) || ($(e.currentTarget).val() > $(e.currentTarget).data('max'))){
	        		$(e.currentTarget).val('');
	        		$('.product[data-line-id="'+ $(e.currentTarget).attr('name') +'"]').find('.item_remain_qty').effect( "bounce", {times:3}, 300 );;
	        	}
	        };
	    },
	    events: _.extend({}, PopupWidget.prototype.events, {
            'click .prev_popup':'click_prev_popup'
        }),
	    selected_item: function($elem){
	    	var self = this;
	    	if($elem.hasClass('select_item')){
	    		$elem.removeClass('select_item')
	    	} else {
	    		$elem.addClass('select_item')
	    	}
	    },
	    auto_back: true,
	    show: function(options){
	    	var self = this;
	    	options = options || {};
	        this._super(options);
	        this.renderElement();
	        $("input#return_order_number").focus();
	        $('.ac_product_list').empty();
	    },
	    click_confirm: function(){
	    	var self = this;
	    	var selectedOrder = this.pos.get_order();
	    	if(selectedOrder.get_ret_o_id()){
	    		if($('.select_item').length > 0){
//	    		Loop for return items
		            _.each($('.select_item'), function(item){
	            		var orderline = self.line[$(item).data('line-id')];
	            		var input_val = $(item).find('input.return_product_qty[name='+orderline.id+']').val()
	            		if(input_val > 0 && input_val <= orderline.return_qty){
	            			var product = self.pos.db.get_product_by_id(orderline.product_id[0]);
		            		var line = new models.Orderline({}, {pos: self.pos, order: selectedOrder, product: product});
		                    line.set_quantity($('input[name="'+orderline.id+'"').val() * -1);
		                    line.set_unit_price(orderline.price_unit);
		                    line.set_oid(orderline.order_id);
		                    selectedOrder.returned_order_reference = selectedOrder.get_ret_o_ref()
		                    selectedOrder.returned_order_id = selectedOrder.get_ret_o_id()
		                    line.returned_order_reference = selectedOrder.get_ret_o_ref()
		                    line.returned_order_id = selectedOrder.get_ret_o_id()
		                    if(orderline.discount){
		                    	line.set_discount(orderline.discount);
		                    }
		                    line.set_back_order(selectedOrder.get_ret_o_ref());
		                    selectedOrder.add_orderline(line);
	            		}
		            });
//		            Loop For Scrap Items
		            _.each($('.select_item'), function(item){
	            		var orderline = self.line[$(item).data('line-id')];
	            		var input_val = $(item).find('input.scrap_product_qty[name='+orderline.id+']').val()
	            		if(input_val > 0 && input_val <= orderline.return_qty){
	            			var product = self.pos.db.get_product_by_id(orderline.product_id[0]);
		            		var line = new models.Orderline({}, {pos: self.pos, order: selectedOrder, product: product});
		                    line.set_quantity(input_val * -1);
		                    line.set_unit_price(orderline.price_unit);
		                    line.set_oid(orderline.order_id);
		                    line.set_back_order(selectedOrder.get_ret_o_ref());
		                    selectedOrder.returned_order_reference = selectedOrder.get_ret_o_ref()
		                    selectedOrder.returned_order_id = selectedOrder.get_ret_o_id()
		                    line.returned_order_reference = selectedOrder.get_ret_o_ref()
		                    line.returned_order_id = selectedOrder.get_ret_o_id()
		                    if(orderline.discount){
		                    	line.set_discount(orderline.discount);
		                    }
		                    line.set_scrap_item(true);
		                    selectedOrder.add_orderline(line);
	            		}
		            });
		            $('#return_order_ref').html(selectedOrder.get_ret_o_ref());
		            this.gui.close_popup();
	    		}else{
	    			alert(_t('Please select any product to return'));
	    		}
	    	}else{
		    	$("input#return_order_number").focus();
		    	alert(_t('Please press enter to view order'));
	    	}

	    },
	    click_cancel: function(){
	    	this.gui.close_popup();
            this.pos.get('selectedOrder').set_ret_o_id('');
            this.pos.get('selectedOrder').destroy();
            $('#return_order_ref').html('');
            $('#return_order_number').val('');
            $("span.remaining-qty-tag").css('display', 'none');
	    },
	    get_product_image_url: function(product_id){
    		return window.location.origin + '/web/binary/image?model=product.product&field=image_medium&id='+product_id;
    	},
    	renderElement: function(){
            this._super();
            this.$('.return_scrap .input-group-addon').delegate('a.js_scrap_qty','click', this.update_scrap_product_qty);
            this.$('.return_product .input-group-addon').delegate('a.js_return_qty','click', this.update_return_product_qty);
            this.$('div.content').delegate('#return_order_number','keypress', this.keypress_order_number);
            this.$('div.input-group').delegate('.js_quantity','input', this.keydown_qty);
            this.$('.ac_product_list').delegate('.product-img','click', this.select_item);
    	},

	    click_prev_popup:function(){
            this.gui.close_popup();
            $("span#return_order").trigger('click')
	    },

	});
	gui.define_popup({name:'pos_return_order', widget: PosReturnOrder});
	gui.define_popup({name:'pos_return_order_list', widget: PosReturnOrderList});

    screens.ProductScreenWidget.include({
        init: function() {
            this._super.apply(this, arguments);
        },

        start:function(){
            var self = this;
            this._super();
            var selectedOrder = self.pos.get_order();
            $('#return_order_ref').html('');
            $("span#return_order").click(function() {
                selectedOrder = self.pos.get_order();
                self.search_query = false;
                self.render_list();
            })

         },
//        Rendered the Search Result of Orders
        render_list: function () {
            var self = this;
            var selectedOrder = self.pos.get_order();
            rpc.query({
                      model: 'pos.order',
                      method: 'search_done_orders_for_pos',
                      args: ['', this.pos.pos_session.id],
            }).then(function(params) {
               if(params && params.length > 0){
                    var lines = [];
                    _.each(params,function(r) {
                        lines.push(r);
                    });
                    self.lines = lines;
                    self.gui.show_popup('pos_return_order_list',{lines:lines})
                    var order_pos_ref = $(".order_reference")
                    if($(order_pos_ref).length)
                    {
                        $(".order_reference").click(function(){
                            var close_button = $(".close_button")
                            if($(close_button).length)
                            {
                                $(".keyboard_frame").css("display","none")
                            }
                            var order_ref = $(this).find(".order_pos_ref").text();
                            if(order_ref.length)
                            {
                                self.gui.show_popup('pos_return_order');
                                var order_ref_val = $("#return_order_number").val(order_ref)
                                if($(order_ref_val).length)
                                {
                                    var e = $.Event( "keypress", { which: 13 } );
                                    $('#return_order_number').trigger(e);
                                }
                            }
                        })
                    }
               }
               else {
                        self.gui.show_popup('pos_return_order');
               }
            })
        },
   	     // Search Part
        search_done_orders: function (query) {
            var self = this;
            return this._rpc({
                model: 'pos.order',
                method: 'search_done_orders_for_pos',
                args: [query || '', this.pos.pos_session.id],
            }).then(function (result) {
                self.orders = result;
                // Get the date in local time
                _.each(self.orders, function (order) {
                    if (order.date_order) {
                        order.date_order = moment.utc(order.date_order)
                            .local().format('YYYY-MM-DD HH:mm:ss');
                    }
                });
            }).fail(function (error, event) {
                if (parseInt(error.code, 10) === 200) {
                    // Business Logic Error, not a connection problem
                    self.gui.show_popup(
                        'error-traceback', {
                            'title': error.data.message,
                            'body': error.data.debug,
                        }
                    );
                } else {
                    self.gui.show_popup('error', {
                        'title': _t('Connection error'),
                        'body': _t(
                            'Can not execute this action because the POS' +
                            ' is currently offline'),
                    });
                }
                event.preventDefault();
            });
        },

        perform_search: function () {
            var self = this;
            return this.search_done_orders(self.search_query)
                .done(function () {
                    self.render_list();
                });
        },
        click_cancel: function(){
	    	this.gui.close_popup();
            this.pos.get('selectedOrder').set_ret_o_id('');
            this.pos.get('selectedOrder').destroy();
            $('#return_order_ref').html('');
            $('#return_order_number').val('');
            $("span.remaining-qty-tag").css('display', 'none');

	    },
//        clear_search: function () {
//            var self = this;
//            self.$('.searchbox input')[0].value = '';
//            self.$('.searchbox input').focus();
//            self.search_query = false;
//            self.perform_search();
//        },

    });

    screens.ReceiptScreenWidget.include({
        show: function(){
            this._super();
            var self = this;
            var barcode_val = this.pos.get_order().get_name();
            if (barcode_val.indexOf(_t("Order ")) != -1) {
                var vals = barcode_val.split(_t("Order "));
                if (vals) {
                    var barcode = vals[1];
                    $("tr#barcode1").html($("<td style='padding:2px 2px 2px 0px; text-align:center;'><div class='" + barcode + "' width='150' height='50'/></td>"));
                    $("." + barcode.toString()).barcode(barcode.toString(), "code128");
                }
            }
        },
        render_receipt: function () {
            if (!this.pos.get_order().get_ret_o_ref()) {
                return this._super();
            }
            else{
                var order = this.pos.get_order();
                this.$('.pos-receipt-container').html(QWeb.render('PosTicket', {
                    widget: this,
                    pos: this.pos,
                    order: order,
                    returned_order_reference : order.get_ret_o_ref(),
                    returned_order_id : order.get_ret_o_id(),
                    receipt: order.export_for_printing(),
                    orderlines: order.get_orderlines(),
                    paymentlines: order.get_paymentlines(),
                }));
                this.pos.from_loaded_order = true;
            }
        },
        click_next: function() {
            this._super();
            this.pos.get('selectedOrder').set_ret_o_id('');
            this.pos.get('selectedOrder').destroy();
            $('#return_order_ref').html('');
            $('#return_order_number').val('');
            $("span.remaining-qty-tag").css('display', 'none');
        },

        wait: function( callback, seconds){
            return window.setTimeout( callback, seconds * 1000 );
	    },
	    print: function() {
	        if (!this.pos.config.iface_print_via_proxy) {
	    		this.pos.get_order()._printed = true;
		        this.wait( function(){ window.print(); }, 2);
	    	} else {
	            this.print_xml();
	            this.lock_screen(false);
	    	}
	    },
	    print_xml: function() {
	        var env = {
	            widget:  this,
	            pos:     this.pos,
	            order:   this.pos.get_order(),
	            receipt: this.pos.get_order().export_for_printing(),
	            paymentlines: this.pos.get_order().get_paymentlines()
	        };
	        var receipt = QWeb.render('XmlReceipt',env);
	        this.pos.proxy.print_receipt(receipt);
	        this.pos.get_order()._printed = true;
	    },
    });

    var orderline_id = 1;
    var _super_orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            this.oid = null;
            this.backorder = null;
            _super_orderline.initialize.call(this, attr, options);
        },
        set_quantity: function(quantity){
            if(quantity === 'remove'){
                this.set_oid('');
                this.pos.get_order().remove_orderline(this);
                return;
            }else{
                _super_orderline.set_quantity.call(this, quantity);
            }
            this.trigger('change',this);
        },
        export_as_JSON: function() {
            var lines = _super_orderline.export_as_JSON.call(this);
            var oid = this.get_oid();
            var return_process = oid;
            var return_qty = this.get_quantity();
            var order_ref = this.pos.get_order() ? this.pos.get_order().get_ret_o_id() : false;

            var new_val = {
                return_process: return_process,
                return_qty: parseInt(return_qty),
                back_order: this.get_back_order(),
                scrap_item: this.get_scrap_item() || false,
            }

            $.extend(lines, new_val);
            return lines;
        },

        set_oid: function(oid) {
            this.set('oid', oid)
        },
        get_oid: function() {
            return this.get('oid');
        },
        set_back_order: function(backorder) {
            this.set('backorder', backorder);
        },
        get_back_order: function() {
            return this.get('backorder');
        },
        set_scrap_item: function(scrap_item) {
            this.set('scrap_item', scrap_item);
        },
        get_scrap_item: function() {
            return this.get('scrap_item');
        },
    });

    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options){
        	_super_order.initialize.apply(this, arguments);
            this.set({
                ret_o_id:       null,
                ret_o_ref:      null,
            });

//            this.receipt_type = 'receipt';  // 'receipt' || 'invoice'
//            this.temporary = options.temporary || false;
//            $("span#sale_mode").trigger('click');
//            return this;
        },
//        generate_unique_id: function() {
//        	var timestamp = new Date().getTime();
//            return timestamp.toString().slice(-10);
//        },
//
//        // return order

        set_ret_o_id: function(ret_o_id) {
            this.set('ret_o_id', ret_o_id)
        },
        get_ret_o_id: function(){
            return this.get('ret_o_id');
        },
        set_ret_o_ref: function(ret_o_ref) {
            this.set('ret_o_ref', ret_o_ref)
        },
        get_ret_o_ref: function(){
            return this.get('ret_o_ref');
        },

        export_for_printing: function(){
            var submitted_order_printing = _super_order.export_for_printing.call(this);
            var order_no = this.get_name() || false ;
            var order_no = order_no ? this.get_name().replace(_t('Order '),'') : false;
            var ret_o_id = this.get_ret_o_id();
            var ret_o_ref = this.get_ret_o_ref();
            var returned_order_reference = '';
            var returned_order_id = '';
            if(ret_o_id)
            {
                returned_order_reference = this.get_ret_o_ref();
                returned_order_id = this.get_ret_o_id();
            }
            var new_val = {
            		'ret_o_id': this.get_ret_o_id(),
            		'order_no': order_no,
            		returned_order_reference:returned_order_reference,
                    returned_order_id:returned_order_id,
            };
            $.extend(submitted_order_printing, new_val);
            return submitted_order_printing;
        },
        export_as_JSON: function() {
            var submitted_order = _super_order.export_as_JSON.call(this);
            var parent_return_order = '';
            var returned_order_reference = '';
            var returned_order_id = '';
            var ret_o_id = this.get_ret_o_id();
            var ret_o_ref = this.get_ret_o_ref();
            var return_seq = 0;
            if (ret_o_id) {
                parent_return_order = this.get_ret_o_id();
                returned_order_reference = this.get_ret_o_ref();
                returned_order_id = this.get_ret_o_id();
                this.pos.reloaded_order = submitted_order

            }
            var backOrders = '';
            _.each(this.get_orderlines(),function(item) {
                if (item.get_back_order()) {
                    return backOrders += item.get_back_order() + ', ';
                }
            });
            var new_val = {
                parent_return_order: parent_return_order, // Required to create paid return order
                return_seq: return_seq || 0,
                back_order: backOrders,
                returned_order_reference:returned_order_reference,
                returned_order_id:returned_order_id,
            }
            $.extend(submitted_order, new_val);
            return submitted_order;
        },

    });

    var ReturnPaymentScreenWidget = screens.PaymentScreenWidget.prototype;
    screens.PaymentScreenWidget.include({
    	validate_order: function(options) {
        	var self = this;
            options = options || {};
            var currentOrder = this.pos.get_order();
            this._super(options);

            currentOrder.set_ret_o_id('');

            $("span.remaining-qty-tag").css('display', 'none');
        },
        wait: function( callback, seconds){
           return window.setTimeout( callback, seconds * 1000 );
        },
    });

    screens.OrderWidget.include({
        set_value: function(val) {
            var order = this.pos.get_order();
            this.numpad_state = this.numpad_state;
            var mode = this.numpad_state.get('mode');
            if (order.get_selected_orderline()) {
                var ret_o_id = order.get_ret_o_id();
                if (ret_o_id) {
                    var prod_id = order.get_selected_orderline().get_product().id;
                    if (order.get_orderlines().length !== 0) {
                        if( mode === 'quantity'){
                            var ret_o_id = order.get_ret_o_id();
                            if (ret_o_id && ret_o_id.toString() != 'Missing Receipt' && val != 'remove') {
                                var self = this;
                                var pids = [];
                                var params = {
                                    model: 'pos.order.line',
                                    method: 'search_read',
                                    domain: [['order_id', '=', ret_o_id],['product_id', '=', prod_id],['return_qty', '>', 0]],
                                    fields: ['return_qty', 'id'],
                                }
	        		            rpc.query(params, {async: false}).then(function(result) {
                                        if (result && result.length > 0) {
                                            if (result[0].return_qty > 0) {
                                                var add_prod = true;
                                                _.each(order.get_orderlines(),function(item) {
                                                    if (prod_id == item.get_product().id &&
                                                        result[0].return_qty < parseInt(val)) {
                                                    	alert(_t("Can not return more products !"));
                                                        add_prod = false;
                                                    }
                                                });
                                            }
                                            if (add_prod) {
                                                if (val != 'remove') {
	                                                order.get_selected_orderline().set_quantity(parseInt(val) * -1);
	                                            } else {
	                                                order.get_selected_orderline().set_quantity(val)
	                                            }
                                            }
                                        }
                                    });
                            } else {
                                order.get_selected_orderline().set_quantity(val);
                            }
                            if(!order.get_selected_orderline() && order.get_ret_o_id()){
                            	$("span#sale_mode").trigger('click');
                            }
                        }else if( mode === 'discount'){
                            order.get_selected_orderline().set_discount(val);
                        }else if( mode === 'price'){
                            order.get_selected_orderline().set_unit_price(val);
                        }
                    } else {
                        this.pos.get('selectedOrder').destroy();
                    }
                } else {
                    this._super(val);
                }
            }
        },
        remove_orderline: function(order_line){
            this._super(order_line);
            if(this.pos.get_order().get_orderlines().length === 0){
                this.pos.get('selectedOrder').set_ret_o_id('');
                this.pos.get('selectedOrder').destroy();
                $('#return_order_ref').html('');
                $('#return_order_number').val('');
                $("span.remaining-qty-tag").css('display', 'none');
                this.renderElement();
            }
        },

    });
    var Newwidgets = chrome.Chrome.prototype.widgets;
    Newwidgets.push({
        'name':   'list_return',
        'widget': ListOrderreturnWidget,
        'prepend': '.pos-rightheader',

    });
    return {
        ListOrderreturnWidget: ListOrderreturnWidget,
        PosReturnOrder:PosReturnOrder,
    };

});
