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
    var pos = require('point_of_sale.models');
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
        init: function() {
            this._super.apply(this, arguments);
            this.options = {};
	        this.line = [];
        },
        start:function(){
            var self = this;
            this._super();
            var selectedOrder = self.pos.get_order();
            $('#return_order_ref').html('');
//            Click Event for return Products
            $("span#return_order").click(function() {
                selectedOrder = self.pos.get_order();
                self.search_query = false;
                self.render_list();
            })

         },
//       Events for Search(Keyup and focus)
	    events: {
            'keyup .searchbox input':  'search_orderlist',
            'focus .searchbox input': 'search_orderlistfocus',
            'click .cancel_new' : 'click_cancel_close',
            'click .close_button' : 'close_click_keyboard'
        },
        close_click_keyboard : function(){
            $(".keyboard_frame").css("display","none");

        },
//        Rendered the Search Result of Orders
        render_list: function () {
            var self = this;
//            If there is no search value present
            if(!$("#search_string").val())
            {
                var selectedOrder = self.pos.get_order();
                var order_id;
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
                                var order_ref = $(this).parent().parent().parent('.order_main_div').find(".order_pos_ref").text();
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
//                              Click event for Reprint
                            $('.order-list-reprint').click(function (event) {
                                $("#search_string").val('')
                                order_id = $(this).parent().parent(".order_class").find("#order_id").val()
                                self.order_list_actions(order_id,event, 'print');
                            });
//                              Click Event for copy
                            $('.order-list-copy').click(function (event) {
                                $("#search_string").val('')
                                order_id = $(this).parent().parent(".order_class").find("#order_id").val()
                                self.order_list_actions(order_id,event, 'copy');
                            });
                        }
                   }
                   else {
                            self.gui.show_popup('pos_return_order');
                   }
                })
            }
//            If there is search String (search order)
            else{
                var order_pos_ref = $(".order_reference")
                if($(order_pos_ref).length)
                {
                    $(".order_reference").click(function(){
                        var close_button = $(".close_button")
                        if($(close_button).length)
                        {
                            $(".keyboard_frame").css("display","none")
                        }
                        var order_ref = $(this).parent().parent().parent('.order_main_div').find(".order_pos_ref").text();
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
//                      Click event for Reprint
                    $('.order-list-reprint').click(function (event) {
                        $("#search_string").val('')
                        order_id = $(this).parent().parent(".order_class").find("#order_id").val()
                        self.order_list_actions(order_id,event, 'print');
                    });
//                      Click Event for copy
                    $('.order-list-copy').click(function (event) {
                        $("#search_string").val('')
                        order_id = $(this).parent().parent(".order_class").find("#order_id").val()
                        self.order_list_actions(order_id,event, 'copy');
                    });
                }
            }
        },
//        List of Actions for Printing and Copying the Order Lists
        order_list_actions: function (order_id,event, action) {
            var self = this;
            var dataset = order_id;
            self.load_order_data(parseInt(dataset, 10))
                .then(function (order_data) {
                    self.order_action(order_data, action);
                });
        },
        load_order_data: function (order_id) {
            var self = this;
            return this._rpc({
                model: 'pos.order',
                method: 'load_done_order_for_pos',
                args: [order_id],
            }).fail(function (error) {
                if (parseInt(error.code, 10) === 200) {
                    // Business Logic Error, not a connection problem
                    self.gui.show_popup(
                        'error-traceback', {
                            'title': error.data.message,
                            'body': error.data.debug,
                        });
                } else {
                    self.gui.show_popup('error', {
                        'title': _t('Connection error'),
                        'body': _t(
                            'Can not execute this action because the POS' +
                            ' is currently offline'),
                    });
                }
            });
        },
        order_action: function (order_data, action) {
            var order = this.load_order_from_data(order_data, action);
            if (!order) {
                // The load of the order failed. (products not found, ...
                // We cancel the action
                return;
            }
            this['action_' + action](order_data, order);
        },
        action_print: function (order_data, order) {
            // We store temporarily the current order so we can safely compute
            // taxes based on fiscal position
            this.pos.current_order = this.pos.get_order();
            this.pos.set_order(order);
            this.pos.reloaded_order = order;
            var skip_screen_state = this.pos.config.iface_print_skip_screen;
            // Disable temporarily skip screen if set
            this.pos.config.iface_print_skip_screen = false;
            this.gui.show_screen('receipt');
            this.pos.reloaded_order = false;
            // Set skip screen to whatever previous state
            this.pos.config.iface_print_skip_screen = skip_screen_state;

            // If it's invoiced, we also print the invoice
            if (order_data.to_invoice) {
                this.pos.chrome.do_action('point_of_sale.pos_invoice_report', {
                    additional_context: { active_ids: [order_data.id] }
                })
            }

            // Destroy the order so it's removed from localStorage
            // Otherwise it will stay there and reappear on browser refresh
            order.destroy();
        },

        action_copy: function (order_data, order) {
            order.trigger('change');
            this.pos.get('orders').add(order);
            this.pos.set('selectedOrder', order);
            return order;
        },
        load_order_from_data: function (order_data, action) {
            var self = this;
            this.unknown_products = [];
            var order = self._prepare_order_from_order_data(
                order_data, action);
            // Forbid POS Order loading if some products are unknown
            if (self.unknown_products.length > 0) {
                self.gui.show_popup('error-traceback', {
                    'title': _t('Unknown Products'),
                    'body': _t('Unable to load some order lines because the ' +
                        'products are not available in the POS cache.\n\n' +
                        'Please check that lines :\n\n  * ') +
                    self.unknown_products.join("; \n  *"),
                });
                return false;
            }
            return order;
        },
        _prepare_order_from_order_data: function (order_data, action) {
            var self = this;
            var order = new pos.Order({}, {
                pos: this.pos,
            });

            // Get Customer
            if (order_data.partner_id) {
                order.set_client(
                    this.pos.db.get_partner_by_id(order_data.partner_id));
            }

            // Get fiscal position
            if (order_data.fiscal_position && this.pos.fiscal_positions) {
                var fiscal_positions = this.pos.fiscal_positions;
                order.fiscal_position = fiscal_positions.filter(function (p) {
                    return p.id === order_data.fiscal_position;
                })[0];
                order.trigger('change');
            }

            // Get order lines
            self._prepare_orderlines_from_order_data(
                order, order_data, action);

            // Get Name
            if (['print'].indexOf(action) !== -1) {
                order.name = order_data.pos_reference;
            }

            // Get to invoice
            if (['return', 'copy'].indexOf(action) !== -1) {
                // If previous order was invoiced, we need a refund too
                order.set_to_invoice(order_data.to_invoice);
            }

            // Get returned Order
            if (['print'].indexOf(action) !== -1) {
                // Get the same value as the original
                order.returned_order_id = order_data.returned_order_id;
                order.returned_order_reference =
                order_data.returned_order_reference;
            } else if (['return'].indexOf(action) !== -1) {
                order.returned_order_id = order_data.id;
                order.returned_order_reference = order_data.pos_reference;
            }

            // Get Date
            if (['print'].indexOf(action) !== -1) {
                order.formatted_validation_date =
                moment(order_data.date_order).format('YYYY-MM-DD HH:mm:ss');
            }

            // Get Payment lines
            if (['print'].indexOf(action) !== -1) {
                var paymentLines = order_data.statement_ids || [];
                _.each(paymentLines, function (paymentLine) {
                    var line = paymentLine;
                    // In case of local data
                    if (line.length === 3) {
                        line = line[2];
                    }
                    _.each(self.pos.cashregisters, function (cashregister) {
                        if (cashregister.journal.id === line.journal_id) {
                            if (line.amount > 0) {
                                // If it is not change
                                order.add_paymentline(cashregister);
                                order.selected_paymentline.set_amount(
                                    line.amount);
                            }
                        }
                    });
                });
            }
            return order;
        },
        _prepare_orderlines_from_order_data: function (
            order, order_data, action) {
            var orderLines = order_data.line_ids || order_data.lines || [];

            var self = this;
            _.each(orderLines, function (orderLine) {
                var line = orderLine;
                // In case of local data
                if (line.length === 3) {
                    line = line[2];
                }
                var product = self.pos.db.get_product_by_id(line.product_id);
                // Check if product are available in pos
                if (_.isUndefined(product)) {
                    self.unknown_products.push(String(line.product_id));
                } else {
                    // Create a new order line
                    order.add_product(product,
                        self._prepare_product_options_from_orderline_data(
                            order, line, action));
                }
            });
        },
        _prepare_product_options_from_orderline_data: function (
            order, line, action) {
            var qty = line.qty;
            return {
                price: line.price_unit,
                quantity: qty,
                discount: line.discount,
                merge: false,
            }
        },

        click_cancel: function(){
	    	this.gui.close_popup();
	    	$("#search_string").val('')
	    	console.log("++++++++cancel",order)
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
//                self.clear_search();
            });
        },
//        Called from Perform Search to search the orders based on letters pressed
        search_done_orders: function (query) {
            var self = this;
            return this._rpc({
                model: 'pos.order',
                method: 'search_done_orders_for_pos',
                args: [query || '', this.pos.pos_session.id],
            }).then(function (result) {
                self.orders = result;
                var orders = []
                var order_list = []
                var search_res;
                _.each(self.orders, function (order) {
                    search_res = $("#search_string").val()
                    if($(search_res))
                    {
                        order_list.push(order)
                    }
                });
                if($(search_res))
                {
                    self.gui.show_popup('pos_return_order_list',{lines:order_list})
                    $("#search_string").val(search_res)
                    self.render_list();
                    $("#search_string").focus();
                }
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
                    //self.render_list();
                });
        },
        click_cancel: function(){
	    	this.gui.close_popup();
	    	console.log("++++++++cancel",order)
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
        click_cancel_close: function(){
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
                                		$("#search_string").val('')
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
	        $("#search_string").val('')
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
	    	$("#search_string").val('')
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
            $("#search_string").val('')
            $("span#return_order").trigger('click')
	    },

	});
	gui.define_popup({name:'pos_return_order', widget: PosReturnOrder});
	gui.define_popup({name:'pos_return_order_list', widget: PosReturnOrderList});
    screens.ReceiptScreenWidget.include({
        show: function(){
            this._super();
            var self = this;
            var barcode_val = this.pos.get_order().get_name();
            if (barcode_val.indexOf(_t("Order ")) != -1) {
                var vals = barcode_val.split(_t("Order "));
                if (vals) {
                    var barcode = vals[1];
                    $("tr#barcode1").html($("<td style='padding:2px 2px 2px 0px; text-align:center;'><div class='" + barcode + " barcode_img'/></td>"));
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
        init_from_JSON: function (json) {
            _super_order.init_from_JSON.apply(this, arguments);
            this.set({
                ret_o_id:       null,
                ret_o_ref:      null,
            });
        },

        export_for_printing: function(){
            var submitted_order_printing = _super_order.export_for_printing.apply(this, arguments);
           
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
