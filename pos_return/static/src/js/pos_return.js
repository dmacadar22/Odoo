odoo.define('pos_return.pos_return', function (require) {
"use strict";

	var core = require('web.core');
	var utils = require('web.utils');
	var rpc = require('web.rpc');
	var screens = require('point_of_sale.screens');
	var gui = require('point_of_sale.gui');
	var models = require('point_of_sale.models');
	var PopupWidget = require('point_of_sale.popups');

	var _t = core._t;
	var QWeb = core.qweb;
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;

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
                                		alert(_t("No item found"));
                                	}
                                });
                        	} else {
                        		alert(_t("No result found"));
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
	    selected_item: function($elem){
	    	var self = this;
	    	if($elem.hasClass('select_item')){
	    		$elem.removeClass('select_item')
	    	} else {
	    		$elem.addClass('select_item')
	    	}

	    },
	    show: function(options){
	    	var self = this;
	        options = options || {};
	        this._super(options);
	        $("span#sale_mode").css('background', '');
	        $("span#return_order").css('background', 'blue');
	        this.renderElement();
	        $("input#return_order_number").focus();
	        $('.ac_product_list').empty();
	    },
	    click_confirm: function(){
	    	var self = this;
	    	var selectedOrder = this.pos.get_order();
	    	if(selectedOrder.get_ret_o_id()){
	    		if($('.select_item').length > 0){
		            _.each($('.select_item'), function(item){
	            		var orderline = self.line[$(item).data('line-id')];
	            		var input_val = $(item).find('input.return_product_qty[name='+orderline.id+']').val()
	            		if(input_val > 0 && input_val <= orderline.return_qty){
	            			var product = self.pos.db.get_product_by_id(orderline.product_id[0]);
		            		var line = new models.Orderline({}, {pos: self.pos, order: selectedOrder, product: product});
		                    line.set_quantity($('input[name="'+orderline.id+'"').val() * -1);
		                    line.set_unit_price(orderline.price_unit);
		                    line.set_oid(orderline.order_id);
		                    if(orderline.discount){
		                    	line.set_discount(orderline.discount);
		                    }
		                    line.set_back_order(selectedOrder.get_ret_o_ref());
		                    selectedOrder.add_orderline(line);
	            		}
		            });
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
	    	$("span#sale_mode").css('background', 'blue');
	        $("span#return_order").css('background', '');
	        $("span#missing_return_order").css('background', '');
	        $("span#sale_mode").trigger('click');
	    	this.gui.close_popup();
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
    	}
	});
	gui.define_popup({name:'pos_return_order', widget: PosReturnOrder});

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
                $("span#return_order").css('background', 'blue');
                $("span#sale_mode").css('background', '');
                $("span#missing_return_order").css('background', '');
                selectedOrder = self.pos.get_order();
                selectedOrder.set_sale_mode(false);
                selectedOrder.set_missing_mode(false);
                self.gui.show_popup('pos_return_order');
            });

            $("span#sale_mode").click(function(event) {
                var selectedOrder = self.pos.get_order();
                var id = $(event.target).data("category-id");
                selectedOrder.set_ret_o_id('');
                selectedOrder.set_sale_mode(true);
                selectedOrder.set_missing_mode(false);
                var category = self.pos.db.get_category_by_id(id);
                self.product_categories_widget.set_category(category);
                self.product_categories_widget.renderElement();

                $("span#sale_mode").css('background', 'blue');
                $("span#return_order").css('background', '');
                $("span#missing_return_order").css('background', '');
                selectedOrder.set_ret_o_ref('');
                $('#return_order_ref').html('');
                $("span.remaining-qty-tag").css('display', 'none');
            });

            $("span#missing_return_order").click(function(event) {
                var selectedOrder = self.pos.get_order();
                var id = $(event.target).data("category-id");
                selectedOrder.set_sale_mode(false);
                selectedOrder.set_missing_mode(true);
                var category = self.pos.db.get_category_by_id(id);
                self.product_categories_widget.set_category(category);
                self.product_categories_widget.renderElement();

                $("span#sale_mode").css('background', '');
                $("span#return_order").css('background', '');
                $("span#missing_return_order").css('background', 'blue');
                selectedOrder.set_ret_o_ref('Missing Receipt');
                $('#return_order_ref').html('Missing Receipt');
                $("span.remaining-qty-tag").css('display', 'none');
            });
        },
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
        click_next: function() {
            this._super();
            this.pos.get('selectedOrder').set_ret_o_id('');
            this.pos.get('selectedOrder').destroy();
            this.pos.get('selectedOrder').set_sale_mode(false);
            this.pos.get('selectedOrder').set_missing_mode(false);
            $("span#sale_mode").css('background', 'blue');
            $("span#return_order").css('background', '');
            $("span#missing_return_order").css('background', '');
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
        can_be_merged_with: function(orderline){
            var merged_lines = _super_orderline.can_be_merged_with.call(this, orderline);
            if(this.get_oid() && this.pos.get('selectedOrder').get_sale_mode()) {
                return false;
            } else if ((this.get_oid() != orderline.get_oid()) &&
                            (this.get_product().id == orderline.get_product().id)) {
                return false;
            } else if(this.get_scrap_item()){
            	return false
            }
            return merged_lines;
        },
        merge: function(orderline){
            if (this.get_oid() || this.pos.get('selectedOrder').get_missing_mode()) {
                this.set_quantity(this.get_quantity() + orderline.get_quantity() * -1);
            } else {
                _super_orderline.merge.call(this, orderline);
            }
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
                sale_mode:      false,
                missing_mode:   false,
            });
            this.receipt_type = 'receipt';  // 'receipt' || 'invoice'
            this.temporary = options.temporary || false;
            $("span#sale_mode").trigger('click');
            return this;
        },
        generate_unique_id: function() {
        	var timestamp = new Date().getTime();
            return timestamp.toString().slice(-10);
        },

        // return order

        set_sale_mode: function(sale_mode) {
            this.set('sale_mode', sale_mode);
        },
        get_sale_mode: function() {
            return this.get('sale_mode');
        },
        set_missing_mode: function(missing_mode) {
            this.set('missing_mode', missing_mode);
        },
        get_missing_mode: function() {
            return this.get('missing_mode');
        },
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
        add_product: function(product, options){
        	var self = this;
            options = options || {};
            var attr = JSON.parse(JSON.stringify(product));
            attr.pos = this.pos;
            attr.order = this;
            var selectedOrder = this.pos.get_order();
            var is_sale_mode = this.get_sale_mode();
            var is_missing_mode = this.get_missing_mode();
            var retoid = this.pos.get_order().get_ret_o_id();
            var order_ref = this.pos.get_order().get_ret_o_ref() // to add backorder in line.
            if(is_missing_mode) {
                var line = new models.Orderline({}, {pos: attr.pos, order: self, product: product});
                if (retoid) {
                    line.set_oid(retoid);
                    line.set_back_order(order_ref);
                }
                if(options.quantity !== undefined){
                    line.set_quantity(options.quantity);
                }
                if(options.price !== undefined){
                    line.set_unit_price(options.price);
                }
                if(options.discount !== undefined){
                    line.set_discount(options.discount);
                }
                var last_orderline = this.get_last_orderline();
                if( last_orderline && last_orderline.can_be_merged_with(line) && options.merge !== false){
                    last_orderline.merge(line);
                }else{
                    line.set_quantity(line.get_quantity() * -1)
                    this.add_orderline(line);
                }
                this.select_orderline(this.get_last_orderline());
            } else {
                _super_order.add_product.call(this, product, options);
            }
        },
        export_for_printing: function(){
            var submitted_order_printing = _super_order.export_for_printing.call(this);
            var order_no = this.get_name() || false ;
            var order_no = order_no ? this.get_name().replace(_t('Order '),'') : false;
            var new_val = {
            		'ret_o_id': this.get_ret_o_id(),
            		'order_no': order_no,
            };
            $.extend(submitted_order_printing, new_val);
            return submitted_order_printing;
        },
        export_as_JSON: function() {
            var submitted_order = _super_order.export_as_JSON.call(this);
            var parent_return_order = '';
            var ret_o_id = this.get_ret_o_id();
            var ret_o_ref = this.get_ret_o_ref();
            var return_seq = 0;
            if (ret_o_id) {
                parent_return_order = this.get_ret_o_id();
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
                sale_mode: this.get_sale_mode(),
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
            currentOrder.set_sale_mode(true);
            currentOrder.set_missing_mode(false);
            $("span#sale_mode").css('background', 'blue');
            $("span#return_order").css('background', '');
            $("span#missing_return_order").css('background', '');
            $('#return_order_ref').html('');
            $('#return_order_number').val('');
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
    });
});
