odoo.define('pos_geniusfund.genius', function (require) {
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
    var field_utils = require('web.field_utils');
    var round_pr = utils.round_precision;
    var QWeb = core.qweb;
    var chrome = require('point_of_sale.chrome');

    var thcLimit = 28.5;
    var concentrateLimit = 8;

    /* Start on customer selection screen */
    chrome.Chrome.include({
        build_widgets: function() {
            var self = this;
            this._super();

            this.gui.set_startup_screen('clientlist');
            this.gui.set_default_screen('clientlist');
        }
    });

    screens.OrderWidget.include({

        init: function(parent, options) {
            var self = this;
            this._super(parent,options);

            // define THC limit
            this.get_thc_legal_limit();

            var client = (this.order && this.order.get_client()) ? this.order.get_client() : null;

            this.update_thc_gauge(0,client);
            this.update_concentrate_gauge(0, client);
        },

        update_summary: function() {

            this._super();

            // define THC limit for the current customer
            this.get_thc_legal_limit(this.pos.get('selectedClient'));

            var order = this.pos.get('selectedOrder');

            /* Get won reward points and total loyalty points of the customer*/
            var client = order.get_client()
            if (client){
                $('#current_reward').text(order.get_won_points())
                $('#total_reward').text(client.loyalty_points)
            }

            /* Update Total */
            var original_price = order ? order.get_original_price() : 0;
            var total_discount = order ? order.get_total_discount() : 0;
            var total_without_tax = order ? order.get_total_without_tax() : 0;
            var total_taxes = order ? order.get_total_tax() : 0;
            var total_with_tax = order ? order.get_total_with_tax() : 0;

            $("#summary_orig_price").text(this.format_currency(original_price));
            $("#summary_discount").text(this.format_currency(total_discount));
            $("#summary_subtotal").text(this.format_currency(total_without_tax));
            $("#summary_taxes").text(this.format_currency(total_taxes));
            $("#summary_total").text(this.format_currency(total_with_tax));
            /* End Update Total */

            /* Update THC Limits */
            var new_thc = order.get_thc_quantities();
            var thc_overflow = this.update_thc_gauge(new_thc, order.get_client());

            var new_concentrate = order.get_concentrate_quantities();
            var concentrate_overflow = this.update_concentrate_gauge(new_concentrate, order.get_client());

            /* Ô design */
            // Payment button
            if(thc_overflow > 0 || concentrate_overflow > 0){
                var warning_msg = 'Remove\r\n';
                if(thc_overflow > 0){
                    warning_msg = warning_msg + Math.abs(thc_overflow.toFixed(2)) + 'g THC\r\n';
                }
                if(concentrate_overflow > 0){
                    warning_msg = warning_msg + Math.abs(concentrate_overflow.toFixed(2)) + 'g Concentrate';
                }
                this.show_error_on_payment_btn(warning_msg);
            }
            else if(!order.has_valid_prices()){
                this.show_error_on_payment_btn("THC products cannot be free");
            }
            else{
                $('.button.pay').prop('disabled', false);
                $('.button.pay').css({"background-color": "#000", "color": "#00EDC2", "border-color": "#00EDC2"});
                $('.pay .achtun-limits').hide();
                $('.text-btn-payment').text('Payment');
            }
        },

        show_error_on_payment_btn: function(error_msg){
            $('.button.pay').prop('disabled', true);
            $('.button.pay').css({"background-color": "#FCF0EF", "color": "#FF0000", "border-color": "#FCF0EF"});
            $('.pay .achtun-limits').show();
            $('.text-btn-payment').text(error_msg);
        },

        /**
        *   Update THC gauge display and corresponding text
        **/
        update_thc_gauge: function (cart_thc, client){
            var persisted_today_quantity = client ? parseFloat(client.x_studio_thc_products_today) : 0;

            var total_today_thc = persisted_today_quantity + cart_thc;
            var legal_thc_limit = thcLimit;
            var today_left_quantity = parseFloat(legal_thc_limit) - parseFloat(total_today_thc);

            $("#actual_thc_today").text(cart_thc.toFixed(2));

            $("#new_thc_today").text(total_today_thc.toFixed(2));
            $('#thc_legal_limit').text(legal_thc_limit.toFixed(2));
            $('#thc_left').text(today_left_quantity > 0 ? today_left_quantity.toFixed(2) : 0);
            set_gauge_thc_value(total_today_thc, legal_thc_limit);

            if(total_today_thc > legal_thc_limit){
                $(".progress .thc_gauge").css({"background-color":"#FF0000"});
                $(".orderline.8").css({"background-color":"#FCF0EF"});
                $(".orderline.8 .product-THC-content").show();
            }else{
                $(".progress .thc_gauge").css({"background-color":"#00EDC2"});
                $(".orderline.8").css({"background-color":"#FFF"});
                $(".orderline.8 .product-THC-content").hide();
            }

            var thc_overflow = (total_today_thc > legal_thc_limit) ? Math.abs(today_left_quantity.toFixed(2)) : 0;
            return thc_overflow;
        },

        /**
        *   Update concentrate gauge display and corresponding text
        **/
        update_concentrate_gauge: function (cart_concentrate, client){
            var persisted_today_concentrate = client ? parseFloat(client.x_studio_concentrate) : 0;

            var total_today_concentrate = persisted_today_concentrate + cart_concentrate;
            var legal_concentrate_limit = concentrateLimit;
            var today_left_concentrate = parseFloat(legal_concentrate_limit) - parseFloat(total_today_concentrate);

            // this is offline concentrate today
            $("#actual_concentrate_today").text(cart_concentrate.toFixed(2));

            $('#new_concentrate_today').text(total_today_concentrate.toFixed(2));
            $('#concentrate_legal_limit').text(legal_concentrate_limit.toFixed(2));
            $('#concentrate_left').text(today_left_concentrate > 0 ? today_left_concentrate.toFixed(2) : 0);
            set_gauge_concentrate_value(total_today_concentrate, legal_concentrate_limit);

            if(total_today_concentrate > legal_concentrate_limit){
                $(".progress .concentrate_gauge").css({"background-color":"#FF0000"});
                $(".orderline.9").css({"background-color":"#FCF0EF"});
                $(".orderline.9 .product-THC-content").show();
            }else{
                $(".progress .concentrate_gauge").css({"background-color":"#00EDC2"});
                $(".orderline.9").css({"background-color":"#FFF"});
                $(".orderline.9 .product-THC-content").hide();
            }

            var concentrate_overflow = (total_today_concentrate > legal_concentrate_limit) ? Math.abs(today_left_concentrate.toFixed(2)) : 0;
            return concentrate_overflow;
        },

        /**
        *   Update this.thcLimit and this.concentrateLimit according to legal thc limit of the POS state
        **/
        get_thc_legal_limit: function(client){

            try {
                var current_state = this.pos.company.state_id; // looks like Array [ 13, "California (US)" ]
                var thc_legal_limit = this.pos.db._genius_get_thc_limit_by_state_id(current_state[0]);

                // set default THC limit to recreational limit
                thcLimit = thc_legal_limit.x_RegLimit;
                concentrateLimit = thc_legal_limit.x_RegLimitC;

                if(client && client.x_studio_mmic_status && client.x_studio_mmic_status == "Medical"){
                    thcLimit = thc_legal_limit.x_MedicalLimit;
                    concentrateLimit = thc_legal_limit.x_MedLimitC;
                }
            } catch(ex){
                console.log("Missing limit, state or client...");
            }
        },

        // Adding product image, plus, minus and delete buttons for each orderline

        render_orderline: function(orderline){

            var self = this;
            var image_url = this.get_product_image_url(orderline.product);
            var el_str  = QWeb.render('Orderline',{widget:this, line:orderline, image_url:image_url});
            var el_node = document.createElement('div');
                el_node.innerHTML = _.str.trim(el_str);
                el_node = el_node.childNodes[0];
                el_node.orderline = orderline;
                el_node.addEventListener('click',this.line_click_handler); // line_click_handler Do we need to select the lines with the new design ? Perhaps for adding a note, a discount...
            var el_lot_icon = el_node.querySelector('.line-lot-icon');
            if(el_lot_icon){
                el_lot_icon.addEventListener('click', (function() {
                    this.show_product_lot(orderline);
                }.bind(this)));
            }

            var el_trash = el_node.querySelector('.btn_remove');
            var el_plus = el_node.querySelector('.btn_plus');
            var el_minus = el_node.querySelector('.btn_minus');
            var order = this.pos.get_order();
            var new_quant = orderline.get_quantity();
            var customer_display = this.pos.config.customer_display;

            if(el_trash){
                el_trash.addEventListener('click', (function(event) {
                    event.stopPropagation();
                    order.remove_orderline(orderline);
                    // Update the customer display onclick
                    if(customer_display){
                        self.pos.get_order().mirror_image_data();
                    }
                }).bind(this));
            }
            if(el_plus){
                el_plus.addEventListener('click', (function(event) {
                    event.stopPropagation();
                    new_quant += 1;
                    orderline.set_quantity(new_quant);
                    // Update the customer display onclick
                    if(customer_display){
                        self.pos.get_order().mirror_image_data();
                    }
                }).bind(this));
            }
            if(el_minus){
                el_minus.addEventListener('click', (function(event) {
                    event.stopPropagation();
                    new_quant -= 1;
                    if(new_quant == 0){
                        order.remove_orderline(orderline);
                    }else{
                        orderline.set_quantity(new_quant);
                    }
                    // Update the customer display onclick
                    if(customer_display){
                        self.pos.get_order().mirror_image_data();
                    }
                }).bind(this));
            }

            orderline.node = el_node;

            return el_node;

        },
        get_product_image_url: function(product){
            return window.location.origin + '/web/image?model=product.product&field=image_small&id='+product.id;
        },

        /**
        *   Overrides standard POS to estimate discount based on the given price
        **/
        set_value: function(val) {
            var order = this.pos.get_order();
            if (order.get_selected_orderline()) {
                var mode = this.numpad_state.get('mode');
                if( mode === 'quantity'){
                    order.get_selected_orderline().set_quantity(val);
                }else if( mode === 'discount'){
                    var selected_orderline = order.get_selected_orderline();
                    selected_orderline.price_manually_set = true;
                    selected_orderline.set_discount(val);
                }else if( mode === 'price'){
                    var selected_orderline = order.get_selected_orderline();
                    selected_orderline.set_new_price(val, true);
                }
            }
        },

    });

    screens.ProductScreenWidget.include({

        show: function(){
            var self = this;
            this._super();
            var order = this.pos.get('selectedOrder');
            if(order.get_client()){
                /* Get won reward points and total loyalty points of the customer*/
                var client = order.get_client()
                $('#current_reward').text(order.get_won_points())
                $('#total_reward').text(client.loyalty_points)

                $(".current-customer").show();
                $(".partner_image").attr("src", "/web/image/res.partner/" + order.get_client().id + "/image_small");
                $(".name_partner").text(order.get_client().name);
                $(".partner_id").text('');
                $(".partner_dob").text(order.get_client().x_studio_date_of_birth);
                $(".partner_since").text('');
                $(".partner_last").text(order.get_client().x_studio_last_visit);
                $(".property_product_pricelist").text(order.get_client().property_product_pricelist[1]);

                if(order.get_client().flag)  this.$('#customer-flag').show();
                else                         this.$('#customer-flag').hide();

            }else{
                $(".current-customer").hide();
                /* Set reward points as 0 if not customer*/
                $('#current_reward').text(0)
                $('#total_reward').text(0)

                this.$('#customer-flag').hide();
            }
        },

        click_product: function(product) {
            var self = this;
            this._super(product);
            this.product_categories_widget.clear_search();
        },

        renderElement: function(){
            var self = this;
            this._super();
            this.$('#coupons-btn').click({context : this}, this.register_coupon);
        },

        register_coupon: function(event){
            var self = event.data.context;
            var order = self.pos.get('selectedOrder');

            if(!order.get_client()){
                self.gui.show_screen('clientlist');
                return;
            } else {
                self.gui.show_popup('coupon',{
                    'title' : 'Coupon Code'
                });
            }
        },

    });

    screens.ProductCategoriesWidget.include({

        perform_search: function(category, query, buy_result){
            var self = this;
            this._super(category, query, buy_result);
            if(query && "" != query){
                $('.categories').hide();
            } else {
                $('.categories').show();
            }
        },

        clear_search: function(){
            var self = this;
            this._super();
            $('.categories').show();
        }
    });

    screens.ActionpadWidget.include({

        renderElement: function() {
            var self = this;
            this._super();

            // if customer already selected
            var order = this.pos.get_order();
            if(order.get_client() == null){
                this.$('.pay').off('click');
                this.$('.pay').click(function(){
                    self.gui.show_screen('clientlist');
                });
            }
        }
    });

    screens.ClientListScreenWidget.include({

        show: function(){
            var self = this;
            var search_timeout = null;
            this._super();
            self.genius_search_last_hour2();
            $('.middle-buttons div').removeClass('customer-filter');
            $('#in_store').addClass('customer-filter');

            /* Display "Back" button if it makes sense (it's not the first screen to appear) */
            var previous_screen = self.pos.get_order().get_screen_data('previous-screen');
            if (previous_screen) {
                this.$('.button.back').show();
                this.reload_partners();
            } else {
                this.$('.button.back').hide();
            }

            this.$('.client-list-contents').delegate('.client-card','click',function(event){
                var idClient = parseInt($(this).data('id'));
                self.new_client = self.pos.db.get_partner_by_id(idClient);
                self.save_changes();
                self.gui.show_screen('products');
            });

            this.$('.in-store').on('click', function(event){
                // ILO code to call search for customer in in-store
                // genius_search_last_hour is the function to call python code
                // genius_search_last_hour2 is the function to call customer from pos_js
                self.genius_search_last_hour2();
            });

            this.$('.today').on('click',function(event){
                clearTimeout(search_timeout);
                var today = get_today_date();
                search_timeout = setTimeout(function(){
                    self.genius_perform_search(today, event.which === 13);
                },70);
            });

            this.$('.all-customers').on('click',function(event){
                self.genius_search_all();
            });

            var $div = $('.middle-buttons div').click(function() {
                $div.removeClass('customer-filter');
                $(this).addClass('customer-filter');
            });

            this.$('.searchbox input').on('keypress keyup keydown',function(event){
                clearTimeout(search_timeout);
                var searchbox = this;
                search_timeout = setTimeout(function(){
                    self.perform_search(searchbox.value, event.which === 13);
                },70);
            });

        },

        perform_search: function(query, associate_result){
            // Override to search customer based on filters
            var self = this;
            var filtered_customers;
            var customers;
            var search_customer = [];

            filtered_customers = self.genius_search_all();
            if((query || query === "") && filtered_customers){
                if(query === "") customers = filtered_customers;
                else customers = this.pos.db.search_partner(query);
                let customer_here = [];
                for (let customer of customers){
                    customer_here.push(customer['id'])
                }
                for (let filter_cus of filtered_customers){
                    if(customer_here.includes(parseInt(filter_cus['id'])))
                    {
                        search_customer.push(filter_cus)
                    }
                }
                this.render_list(search_customer);
                $('.middle-buttons div').removeClass('customer-filter');
                $('#all_customers').addClass('customer-filter');
            }
        },

        clear_search: function(){
            // Override to get results according to the selected filter
            var self = this;
            if ($("li.customer-filter").attr('id') == 'in_store'){
                self.genius_search_last_hour2();
            }
            if ($("li.customer-filter").attr('id') == 'today'){
                self.genius_perform_search(get_today_date());
            }
            if ($("li.customer-filter").attr('id') == 'all_customers'){
                self.genius_search_all();
            }
            this.$('.searchbox input')[0].value = '';
            this.$('.searchbox input').focus();
        },

        reload_partners: function(){
            //Override to get instore customers
            var self = this;
            return this.pos.load_new_partners().then(function(){
                // partners may have changed in the backend
                self.partner_cache = new screens.DomCache();
                self.genius_search_last_hour2()

                // update the currently assigned client if it has been changed in db.
                var curr_client = self.pos.get_order().get_client();
                if (curr_client) {
                    self.pos.get_order().set_client(self.pos.db.get_partner_by_id(curr_client.id));
                }
            });
        },

        save_changes: function(){
            this._super();

            // Refresh gauges on client change
            var order = this.pos.get('selectedOrder');
            var order_widget = this.gui.screen_instances.products.order_widget;
            order_widget.get_thc_legal_limit(this.pos.get('selectedClient'));
            order_widget.update_thc_gauge(order.get_thc_quantities(), order.get_client());
            order_widget.update_concentrate_gauge(order.get_concentrate_quantities(), order.get_client());
        },

        genius_search_last_hour2: function () {
            var customers = this.pos.db.get_partners_sorted();
            var last_hr = moment.utc().subtract(1, 'hours');

            let customer_here = [];
            for (let customer of customers){
                if (customer['x_studio_last_visit']){
                    let last_visit_date = field_utils.parse.datetime(customer['x_studio_last_visit']);
                    if (last_visit_date >= last_hr) {
                        customer_here.push(customer)
                    }
                }
            }
            if (customer_here) {
                this.render_list(customer_here);
                return customer_here
            }
        },

        // I don't want to have focus on the search input
        genius_search_all: function(){
            var customers = this.pos.db.get_partners_sorted();
            let customer_here = [];
            for (let customer of customers){
                if (customer['x_studio_last_visit']) {
                    customer_here.push(customer)
                }
            }
            if (customer_here) {
                this.render_list(customer_here);
                return customer_here
            }
            this.$('.searchbox input')[0].value = '';
        },
        genius_perform_search: function(query, associate_result){
            var customers;
            if(query){
                customers = this.pos.db.genius_search_partner(query);
                this.display_client_details('hide');
                if ( associate_result && customers.length === 1){
                    this.new_client = customers[0];
                    this.save_changes();
                    this.gui.back();
                }
                this.render_list(customers);
                return customers
            }else{
                customers = this.pos.db.get_partners_sorted();
                this.render_list(customers);
            }
        },

        render_list: function(partners){
            partners.sort(this.pos.db.sort_partners);

            // Override to add thc_limit and concentrate_limit value in partner
            var contents = this.$el[0].querySelector('.client-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(partners.length,1000); i < len; i++){
                var partner    = partners[i];
                var clientline = this.partner_cache.get_node(partner.id);

                // Code to get thc_limit and concentrate_limit value
                var order_widget = this.gui.screen_instances.products.order_widget;
                order_widget.get_thc_legal_limit(partner);
                partner['legal_thc_limit'] = thcLimit.toFixed(2)
                partner['legal_concentrate_limit'] = concentrateLimit.toFixed(2)

                if(!clientline){
                    var clientline_html = QWeb.render('ClientLine',{widget: this, partner:partners[i]});
                    var clientline = document.createElement('tbody');
                    clientline.innerHTML = clientline_html;
                    clientline = clientline.childNodes[1];
                    this.partner_cache.cache_node(partner.id,clientline);
                }
                if( partner === this.old_client ){
                    clientline.classList.add('highlight');
                }else{
                    clientline.classList.remove('highlight');
                }
                contents.appendChild(clientline);
            }
        },


    });

    /* Payment screen */
    screens.PaymentScreenWidget.include({

        init:function(parent,options){
			this._super(parent);
			this.enable_cash_limit = false;
			this.set_limit = 0;
			this.load_config();
		},
		load_config: function(){
			var self = this;
			if(self.pos.config){
				var params = {
	        		model: 'pos.config',
	        		method: 'load_config',
	        		args: [self.pos.config.id],
	        	}
	        	rpc.query(params, {async: false})
	            .then(function(pos_config){
	            	if(pos_config && pos_config[0]){
	            		self.enable_cash_limit = pos_config[0].enable_cash_limit || false;
	            		self.set_limit = pos_config[0].set_limit || 0;
	            	}
	            });
			}
		},

        render_paymentlines: function() {
            var self  = this;
            // Code to display change in payment lines
            var customer_display = this.pos.config.customer_display;
    		if(customer_display){
    			this.pos.get_order().mirror_image_data();
    		}
            var order = this.pos.get_order();
            if (!order) {
                return;
            }

            var lines = order.get_paymentlines();
            var due   = order.get_due();
            var extradue = 0;
            if (due && lines.length  && due !== order.get_due(lines[lines.length-1])) {
                extradue = due;
            }


            this.$('.paymentlines-container').empty();
            var lines = $(QWeb.render('PaymentScreen-Paymentlines', {
                widget: this,
                order: order,
                paymentlines: lines,
                extradue: extradue,
            }));

            lines.on('click','.delete-button',function(){
                self.click_delete_paymentline($(this).data('cid'));
            });

            lines.on('click','.paymentline',function(){
                self.click_paymentline($(this).data('cid'));
            });

            lines.appendTo(this.$('.paymentlines-container'));

            $("#total-price").text('$' + order.get_total_with_tax());

            if(due >= 0){
                var classDue = 'i-want-to-be-red';
                $(".label-due-or-change").text('Due');
            }else{
                var classDue = 'i-want-to-be-green';
                $(".label-due-or-change").text('Change');
            }
            $(".recap-due div").removeClass('i-want-to-be-red i-want-to-be-green').addClass(classDue);
            $(".total-due-or-change").text('$' + Math.abs(due.toFixed(2)));

        },

        order_is_valid: function(force_validation) {
            // Override to check cash limit
            var self = this;
            var order = this.pos.get_order();

            // FIXME: this check is there because the backend is unable to
            // process empty orders. This is not the right place to fix it.
            if (order.get_orderlines().length === 0) {
                this.gui.show_popup('error',{
                    'title': _t('Empty Order'),
                    'body':  _t('There must be at least one product in your order before it can be validated'),
                });
                return false;
            }

            if(self.enable_cash_limit){
                var lines = order.get_paymentlines();
                for (i = 0; i < lines.length; i++) {
                    var ongoing_transaction_amt = 0
                    if(lines[i].cashregister.journal.type === 'cash'){
                        ongoing_transaction_amt = lines[i].amount
                    }
                    rpc.query({
                        model: 'account.bank.statement',
                        method: 'get_total_cash',
                        args: [ongoing_transaction_amt, order.pos_session_id],
                    })
                    .then(function(result){
                        if(result && result >= self.set_limit && self.set_limit != 0){
                            self.gui.show_popup('error',{
                                'title': _t('Warning'),
                                'body':  _t('There is more than '+ self.set_limit +' cash in the register'),
                            });

                        }
                    });
                }
            }

            if (!order.is_paid() || this.invoicing) {
                return false;
            }

            // The exact amount must be paid if there is no cash payment method defined.
            if (Math.abs(order.get_total_with_tax() - order.get_total_paid()) > 0.00001) {
                var cash = false;
                for (var i = 0; i < this.pos.cashregisters.length; i++) {
                    cash = cash || (this.pos.cashregisters[i].journal.type === 'cash');
                }
                if (!cash) {
                    this.gui.show_popup('error',{
                        title: _t('Cannot return change without a cash payment method'),
                        body:  _t('There is no cash payment method available in this point of sale to handle the change.\n\n Please pay the exact amount or add a cash payment method in the point of sale configuration'),
                    });
                    return false;
                }
            }

            // if the change is too large, it's probably an input error, make the user confirm.
            if (!force_validation && order.get_total_with_tax() > 0 && (order.get_total_with_tax() * 1000 < order.get_total_paid())) {
                this.gui.show_popup('confirm',{
                    title: _t('Please Confirm Large Amount'),
                    body:  _t('Are you sure that the customer wants to  pay') +
                           ' ' +
                           this.format_currency(order.get_total_paid()) +
                           ' ' +
                           _t('for an order of') +
                           ' ' +
                           this.format_currency(order.get_total_with_tax()) +
                           ' ' +
                           _t('? Clicking "Confirm" will validate the payment.'),
                    confirm: function() {
                        self.validate_order('confirm');
                    },
                });
                return false;
            }

            return true;
        },

    });

    /* Popup for the notes */
    var NotesPopup = pos_popup.extend({
        template:'NotesPopup',

        init: function(parent, options){
            this._super(parent, options);
            this.options = {};
            this.pos_reference = "";
            this.flag_checked = false;
        },
        show: function(options){
            this._super(options);

            $('.btn-flag').click({widget:this}, this.click_customer_flag);

            var client = this.pos.get('selectedClient');
            this.flag_checked = client.flag;
            if(this.flag_checked) $('.btn-flag').removeClass('unchecked').addClass('checked');
            else                  $('.btn-flag').removeClass('checked').addClass('unchecked');

            rpc.query({
                model: 'pos.genius.functions',
                method: 'find_notes_popup',
                args: [{client}]
            }).then(function (last_note) {
                if(last_note) $('#customerNote').text(last_note);
            });
        },
        click_customer_flag: function(event){
            var self = event.data.widget;

            if($(this).hasClass('checked')){
                $(this).removeClass('checked').addClass('unchecked');
                self.flag_checked = false;
            }
            else {
                $(this).removeClass('unchecked').addClass('checked');
                self.flag_checked = true;
            }
        },
        events: {
            'click .button.cancel':  'click_cancel',
            'click .button.save': 'click_save',
        },
        click_save: function(){
            let that = this;
            // let value = document.getElementById("customerNote").value;
            let value = this.$('.selection #customerNote')[0].value;
            let client = this.pos.get('selectedClient');
            client.flag = this.flag_checked;
            rpc.query({
                model: 'pos.genius.functions',
                method: 'pos_notes_popup',
                args: [value, client]
            }).then(function (result) {
                that.gui.close_popup();
                that.gui.screen_instances.products.show()
            });
        },
        click_cancel: function(){
            this.gui.close_popup();
        },
    });
    gui.define_popup({name:'NotesPopup', widget: NotesPopup});



    /* Popup for the profil */
    var ProfilePopup = pos_popup.extend({
        template:'ProfilePopup',
        init: function(parent, options){
            this._super(parent, options);
            this.options = {};
            this.pos_reference = "";

        },
        show: function(options){
            this._super(options);
            var client = this.pos.get('selectedClient');
        },
        renderElement: function () {
            this._super();
            var self = this;

            rpc.query({
                model: 'res.country.state',
                method: 'search_read',
                args: [],
                fields: ['name', 'model', 'type', 'display_name'],
            }).then(function (state_result) {
                rpc.query({
                    model: 'res.country',
                    method: 'search_read',
                    args: [],
                    fields: ['name', 'model', 'type'],
                }).then(function (country_result) {
                    if(self.pos.get('selectedClient')){
                        var client = self.pos.get('selectedClient');
                        console.log('client:',client);
                        var rows = "<tr><input type='hidden' id='id' name='id' value='" + client.id + "'/></tr>";
                        rows += "<tr><td class=\"strong\">Name</td><td> <input type='text' id='name' name='name' class='input_disabled' disabled='true' value='" + self.check_value(client.name) + "'/></td> </tr>";
                        rows += "<tr class='hide-element'><td class=\"strong\">Address</td><td>" + client.address + "</td> </tr>";

                        rows += "<tr class='hidden'><td class=\"strong\">Street</td><td> <input type='text' class='input_disabled' id='street' name='street'  value='" + self.check_value(client.street) + "'/></td> </tr>";
                        rows += "<tr class='hidden'><td class=\"strong\">City</td><td> <input type='text' class='input_disabled' id='city' name='city'  value='" + self.check_value(client.city) + "'/></td> </tr>";
                        rows += "<tr class='hidden'><td class=\"strong\">Zip</td><td> <input type='text' class='input_disabled' id='zip' name='zip'  value='" + self.check_value(client.zip) + "'/></td> </tr>";

                        rows += "<tr class='hidden'><td class=\"strong\">State</td><td> <select id='state_id' class='input_disabled'>"
                        rows += "<option value=''></option>";
                        for (var state in state_result) {
                            if (client.state_id[0] == state_result[state]['id']){
                                rows += "<option value='" + self.check_value(state_result[state]['id']) + "' selected='selected'>" + state_result[state]['name'] +"</option>";
                            }
                            else{
                                rows += "<option value='" + state_result[state]['id'] + "'>" + state_result[state]['display_name'] +"</option>";
                            }
                        }
                        rows += "</select></td></tr>";

                        rows += "<tr class='hidden'><td class=\"strong\">Country</td><td> <select id='country_id' class='input_disabled'>"
                        rows += "<option value=''></option>";
                        for (var country in country_result) {
                            if (client.country_id[0] == country_result[country]['id']){
                                rows += "<option value='" + self.check_value(country_result[country]['id']) + "' selected='selected'>" + country_result[country]['name'] +"</option>";
                            }
                            else{
                                rows += "<option value='" + country_result[country]['id'] + "'" + ">" + country_result[country]['name'] +"</option>";
                            }
                        }
                        rows += "</select></td></tr>";
                        rows += "<tr><td class=\"strong\">Email</td><td><input type='text' class='input_disabled' id='email' name='email' disabled='true' value='" + self.check_value(client.email) + "'/></td> </tr>";
                        rows += "<tr><td class=\"strong\">Phone</td><td><input type='text' class='input_disabled' id='ph_no' name='ph_no' disabled='true' value='" + self.check_value(client.phone) + "'/></td> </tr>";
                        rows += "<tr class='hidden'><td class=\"strong\">Date of Birth</td><td><input type='date' class='input_disabled' id='dob' name='dob'  value='" + self.check_value(client.x_studio_date_of_birth) + "'/></td> </tr>";
                        rows += "<tr class='hide-element'><td class=\"strong\">Age</td><td><input type='text' class='input_disabled' id='age' name='age'  value='" + self.check_value(get_age(client.x_studio_date_of_birth)) + "'/></td> </tr>";
                        rows += "<tr class='hide-element'><td class=\"strong\">Member</td><td>" + get_since(client.create_date) + "</td> </tr>";

                        rows += "<tr class='hide-element'><td colspan=\"2\"><![CDATA[&nbsp;]]></td></tr>";

                        rows += "<tr class='hide-element'><td class=\"strong\">Pricelist</td><td>" + client.property_product_pricelist[1] + "</td></tr>";
                        rows += "<tr class='hide-element'><td class=\"strong\">Medical Patient</td><td>?</td></tr>";
                        // ILO add some fields in profile
                        // x_studio_mmic, x_studio_avg_receipt, x_studio_total_visits,
                        // x_studio_first_visit, x_studio_last_visit, x_studio_last_location_id
                        rows += "<tr class='hide-element'><td class=\"strong\">MMID</td><td>" + client.x_studio_mmic + "</td></tr>";
                        rows += "<tr class='hide-element'><td class=\"strong\">YTD Spend</td><td>?</td></tr>";
                        rows += "<tr class='ineedaline hide-element'><td class=\"strong\">AVG Receipts</td><td>" + client.x_studio_avg_receipt + "</td></tr>";

                        rows += "<tr class='hide-element'><td colspan=\"2\"><![CDATA[&nbsp;]]></td></tr>";

                        rows += "<tr class='hide-element'><td class=\"strong\">Total Visits</td><td>" + client.x_studio_total_visits + "</td></tr>";
                        rows += "<tr class='hide-element'><td class=\"strong\">First Vist</td><td>" + client.x_studio_first_visit + "</td></tr>";
                        rows += "<tr class='hide-element'><td class=\"strong\">Last Vist</td><td>" + client.x_studio_last_visit + "</td></tr>";
                        rows += "<tr class='ineedaline hide-element'><td class=\"strong\">Location</td><td class=\"test\">" + client.x_studio_last_location_id + "</td></tr>";

                        rows += "<tr class='hide-element'><td colspan=\"2\"><![CDATA[&nbsp;]]></td></tr>";

                        rows += "<tr class='hide-element'><td class=\"strong\">Rewards Program</td><td>" + client.loyalty_points + "</td></tr>";
                        rows += "<tr class='hide-element'><td colspan=\"2\"><![CDATA[&nbsp;]]></td></tr>";
                        rows += "<tr><td colspan='2' style='display:none; text-align: center!important; font-size: 17px!important;' class='show-error'> Please check the Date of Birth </td></tr>"
                        $(rows).appendTo(".table-profile tbody");
                    }
                });
            });
        },
        on_state_change: function(){
            //selects country based on state
            if ($("#state_id").val()){
                rpc.query({
                    model: 'res.country.state',
                    method: 'search_read',
                    domain: [['id', '=', $("#state_id").val()]],
                    fields: ['name', 'model', 'type', 'country_id'],
                    limit: 1,
                }).then(function (result) {
                    $("#country_id").val(result[0]['country_id'][0])
                });
            }
        },
        on_country_change: function(){
            //Filters states based on country selection
            if ($("#country_id").val()){
                rpc.query({
                    model: 'res.country.state',
                    method: 'search_read',
                    domain: [['country_id', '=', parseInt($("#country_id").val())]],
                    fields: ['name', 'model', 'type'],
                }).then(function (result) {
                    var option = '';
                    option += "<option value=''></option>";
                    for (var state in result) {
                        option += "<option value='" + result[state]['id'] + "'>" + result[state]['name'] +"</option>";
                    }
                    $('#state_id').html(option)
                });
            }
            else{
                rpc.query({
                    model: 'res.country.state',
                    method: 'search_read',
                    fields: ['name', 'model', 'type'],
                }).then(function (result) {
                    var option = '';
                    option += "<option value=''></option>";
                    for (var state in result) {
                        option += "<option value='" + result[state]['id'] + "'>" + result[state]['name'] +"</option>";
                    }
                    $('#state_id').html(option)
                });
            }
        },
        events: {
            'click .button.cancel':  'click_cancel',
            'click .button.save': 'click_save',
            'click .button.edit':  'click_edit',
            'click .button.discard':  'click_discard',
            'change #state_id': 'on_state_change',
            'change #country_id': 'on_country_change',
        },
        check_value: function(value){
            //code to empty the field value if value is undefined or false
            if(typeof value === "undefined" || value === "false" || value == false){
                value = '';
            }
            return value
        },
        click_save: function(){
            // here the code to save the customer
            var self = this;
            var dob = new Date($("#dob").val());
            var CurrentDate = new Date();
            if (dob > CurrentDate){
                $(".show-error").addClass("error");
            }else{
                rpc.query({
                    model: 'res.partner',
                    method: 'change_customer_details',
                    args: [{'id': $("#id").val(), 'name': $("#name").val(),
                    'street': $("#street").val(),
                    'email': $("#email").val(), 'ph_no': $("#ph_no").val(),
                    'dob': $("#dob").val(), 'zip': $("#zip").val(),
                    'state_id': $("#state_id").val(), 'city': $("#city").val(),
                    'country_id': $("#country_id").val()}],
                })
                .then(function (result) {
                    if (result) {
                        var client = self.pos.get('selectedClient');
                        client['name'] = result['name']
                        client['email'] = result['email']
                        client['phone'] = result['phone']
                        client['street'] = result['street']
                        client['x_studio_date_of_birth'] = result['x_studio_date_of_birth']
                        client['zip'] = result['zip']
                        if(result['country_id']){
                            rpc.query({
                                model: 'res.country',
                                method: 'search_read',
                                domain: [['id', '=', parseInt(result['country_id'])]],
                                fields: ['name', 'model', 'type'],
                            }).then(function (country) {
                                if (country){
                                    client['country_id'] = [country[0]['id'], country[0]['name']]
                                    client['address'] = client['street'] +', '+ client['zip'] +' '+ client['city'] +', '+ client['country_id'][1];
                                }
                            })
                        }else{
                            client['country_id'] = false
                            client['address'] = client['street'] +', '+ client['zip'] +' '+ client['city'] +', '+ client['country_id'][1];
                        }
                        if(result['state_id']){
                            rpc.query({
                                model: 'res.country.state',
                                method: 'search_read',
                                domain: [['id', '=', parseInt(result['state_id'])]],
                                fields: ['name', 'model', 'type'],
                            }).then(function (state) {
                                if (state){
                                    client['state_id'] = [state[0]['id'], state[0]['name']]
                                }
                            })
                        }else{
                            client['state_id'] = false
                        }
                        self.gui.close_popup();
                    }
                });
            }
        },
        click_edit: function(){
            // here the code to edit the customer profile
            $("#name").attr("disabled", false);
            $("#email").attr("disabled", false);
            $("#ph_no").attr("disabled", false);
            $(".edit").hide();
            $(".cancel").hide();
            $(".save").show();
            $(".discard").show();
            $(".input_disabled").addClass('input_design').removeClass("input_disabled");
            $(".hide-element").hide();
            $(".hidden").removeClass("hidden");
        },
        click_cancel: function(){
            $(".pos .modal-dialog .popup").css({"height":"400px"});
            $(".pos .modal-dialog .popup .selection").css({"max-height":"273px"});
            this.gui.close_popup();
        },
        click_discard: function(){
            //code to close the popup
            $(".pos .modal-dialog .popup").css({"height":"400px"});
            $(".pos .modal-dialog .popup .selection").css({"max-height":"273px"});
            this.gui.close_popup();
        }

    });
    gui.define_popup({name:'ProfilePopup', widget: ProfilePopup});

    /* Popup used by the manager to log in */
    var GeniusPasswordPopupWidget = pos_popup.extend({
        template:'GeniusPasswordPopupWidget',
        show: function(options){
            options = options || {};
            this._super(options);

            this.inputbuffer = '' + (options.value   || '');
            this.decimal_separator = _t.database.parameters.decimal_point;
            this.renderElement();
            this.firstinput = true;
        },
        click_numpad: function(event){
            var newbuf = this.gui.numpad_input(
                this.inputbuffer,
                $(event.target).data('action'),
                {'firstinput': this.firstinput});

            this.firstinput = (newbuf.length === 0);

            if (newbuf !== this.inputbuffer) {
                this.inputbuffer = newbuf;
                this.$('.value').text(this.inputbuffer);
            }
            var $value = this.$('.value');
            $value.text($value.text().replace(/./g, '•'));
        },
        click_confirm: function(){
            this.reset_error();
            var validated = true;
            if( this.options.validate ){
                validated = this.options.validate.call(this,this.inputbuffer);
            }
            if(validated){
                this.gui.close_popup();
                if( this.options.confirm ){
                    this.options.confirm.call(this,this.inputbuffer);
                }
            }
        },
        renderElement: function(){
            this._super();
            this.$('.popup').addClass('popup-password');
        },
        show_error: function(error_msg){
            $('.validation-error-msg').text(error_msg);
            this.gui.numpad_input(this.inputbuffer,'CLEAR',{'firstinput': this.firstinput});
            this.$('.value').text('');
            this.inputbuffer = '';
        },
        reset_error:function(){
            $('.validation-error-msg').text('');
        },
    });
    gui.define_popup({name:'GeniusPasswordPopupWidget', widget: GeniusPasswordPopupWidget});

});
