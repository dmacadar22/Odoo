odoo.define("vouchers_pos.coupons", function (require) {
    "use strict";
    var core = require('web.core');
    var pos_screen = require('point_of_sale.screens');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var pos_model = require('point_of_sale.models');
    var pos_popup = require('point_of_sale.popups');
    var gui = require('point_of_sale.gui');
    var models = pos_model.PosModel.prototype.models;
    var PosModelSuper = pos_model.PosModel;
    var OrderSuper = pos_model.Order;
    var rpc = require('web.rpc');
    var core = require('web.core');
    var _t = core._t;
    var utils = require('web.utils');
    var round_pr = utils.round_precision;


    /**
        From a code
        Return an array made of [coupon, voucher] when found in POS cache

        @param {string}     code     : code entered to find corresponding coupon / voucher
        @param {coupons}    coupons  : array of defined coupons
        @param {Array}      vouchers : array of defined vouchers
    **/
    function find_coupon(code, coupons, vouchers) {
        var coupon = [];
        for(var i in coupons){
            if (coupons[i]['code'] == code){
                coupon.push(coupons[i]);
            }
        }
        if(coupon.length > 0){
            for(var i in vouchers){
                if (vouchers[i]['id'] == coupon[0]['voucher'][0]){
                    coupon.push(vouchers[i]);
                    return coupon;
                }
            }
        }
        return false
    }

    /**
        Return the only product 'Gift-Coupon' if found in cached products

        @param {Array} products : array of products
    **/
    function get_coupon_product(products) {
        for (var i in products){
            if(products[i]['display_name'] == 'Gift-Coupon')
                return products[i]['id'];
        }
        return false;
    }

    /**
        Returns true if current_date is in [start_date, end_date] interval
        otherwise, returns false

        All dates are expected to be string with YYYY-MM-DD format

        @param {string} current_date :  the date to test
        @param {string} start_date   :  lowest allowed date (can be null)
        @param {string} end_date     :  highest allowed date (can be null)
    **/
    function is_between(current_date, start_date, end_date){
        if(start_date && current_date < start_date){
            return false;
        }
        if(end_date && current_date > end_date){
            return false;
        }
        return true;
    }

    // getting vouchers and coupons
    models.push(
        {
            model: 'gift.voucher.pos',
            fields: ['id', 'voucher_type', 'name', 'product_id', 'expiry_date', 'product_categ'],
            loaded: function (self, vouchers) {
                    self.vouchers = vouchers;
            },
        },{
            model: 'gift.coupon.pos',
            fields: ['id', 'name', 'code', 'voucher', 'start_date',
                'end_date', 'partner_id', 'limit', 'total_avail', 'voucher_val', 'type'],
            loaded: function (self, coupons) {
                self.coupons = coupons;
            },
        },
        {
            model: 'partner.coupon.pos',
            fields: ['partner_id', 'coupon_pos', 'number_pos'],
            loaded: function (self, applied_coupon) {
                self.applied_coupon = applied_coupon;
            },
        }
        );

    var VoucherWidget = pos_screen.ActionButtonWidget.extend({
        template:"VoucherWidget",
        init: function(parent) {
            return this._super(parent);
        },
        renderElement: function () {
            var self = this;
            this._super();
            this.$(".coupons").click(function () {
                self.gui.show_popup('coupon',{
                    'title': _t('Enter Your Coupon'),
                });
            });
        },
    });


    pos_screen.ProductScreenWidget.include({
        start: function(){
            this._super();
            this.coupons = new VoucherWidget(this,{});
            this.coupons.replace(this.$('.placeholder-VoucherWidget'));
        },
    });

    var CouponPopupWidget = pos_popup.extend({
        template: 'CouponPopupWidget',
        init: function(parent) {
            this.coupon_product = null;
            return this._super(parent);
        },
        show: function(options){
            options = options || {};
            this._super(options);
            if(!this.coupon_product)
                this.coupon_product = get_coupon_product(this.pos.db.product_by_id);
            this.flag = true;
            this.applied_coupon = null;
            this.last_validated_coupon = null;
            this.renderElement();
            this.$('input').focus();

            this.$(".submit-coupon").addClass("disabled");
            self.$(".coupon_code").removeClass("red");
            self.$('.coupon_applied').hide();
            self.$('.coupon_work').show();
            if(this.pos.get_order().coupon){
                this.display_error('Warning','You already applied a coupon to this order.', true);
            }
        },
        click_confirm: function(){
            var value = this.$('input').val();
            if( this.options.confirm ){
                this.options.confirm.call(this,value);
            }
        },
        renderElement: function () {
            this._super();
            var self = this;

            this.$(".coupon_code").off().on('input',function () {

                self.$(".submit-coupon").removeClass("disabled");
                self.$(".coupon_code").removeClass("red");
                self.flag = false;

                if(self.$(".coupon_code").val() == '') {
                    self.$(".submit-coupon").addClass("disabled");
                    self.$(".submit-coupon").off('click');
                } else {
                    self.$(".submit-coupon").off().on('click',function (event) {
                        event.stopPropagation();
                        event.preventDefault();
                        // checking the code entered
                        self.last_validated_coupon = self.validate_code();
                        if(self.last_validated_coupon) self.apply_coupon(self.last_validated_coupon);
                    });
                }
            });
        },
        /**
            Apply validated coupon to the cart :
            - for fixed amount :
                    - add a Gift-Coupon product to the cart (assuming that the future total amount remains positive)
            - for percentage amount :
                    - set a discount on every order line (except returns)
        **/
        apply_coupon: function(last_validated_coupon){
            var self = this;

            var coupon_product = self.pos.db.get_product_by_id(self.coupon_product);

            if (last_validated_coupon.type == 'fixed') {
                // add a Gift-Coupon product with appropriate price (if total amount of the cart remains positive)
                var current_cart_amount = self.pos.get_order().get_total_with_tax();
                var future_cart_amount = current_cart_amount - last_validated_coupon.voucher_val;
                if(future_cart_amount > 0){
                    // add a Gift-Coupon product with appropriate price
                    coupon_product.list_price = coupon_product.lst_price = last_validated_coupon.voucher_val;
                    self.pos.get_order().add_product(coupon_product, {quantity: -1, extras: {is_removable: false}});
                    self.pos.get_order().trigger('change');
                    self.pos.get_order().set_coupon(last_validated_coupon);
                    self.declare_as_used(last_validated_coupon);

                } else {
                    self.display_error('Unable to apply Coupon', 'Coupon amount is too large to apply. The total amount cannot be negative', true);
                }
            }
            if (last_validated_coupon.type == 'percentage') {
                // Apply discount on every item on the cart (except returns)
                var lines_to_recompute = _.filter(self.pos.get_order().get_orderlines(), function (line) {
                        return ! line.price_manually_set && ! line.is_return() ;
                });
                for(var i in lines_to_recompute){
                    lines_to_recompute[i].set_discount(self.last_validated_coupon.voucher_val);
                }
                self.pos.get_order().trigger('change');
                self.pos.get_order().set_coupon(last_validated_coupon);
                self.declare_as_used(last_validated_coupon);
            }
        },
        declare_as_used: function(coupon){
            var self = this;
            // updating coupon balance after applying coupon
            var client = self.pos.get_client();
            var order = self.pos.get_order();

            var temp = {
                'partner_id': client['id'],
                'coupon_pos': coupon.code,
            };
            rpc.query({
                model: 'partner.coupon.pos',
                method: 'update_history',
                args: ['', temp]
            }).done(function (result) {
                var applied = self.pos.applied_coupon;
                var already_used = false;
                // If coupon was previously used, increment customer use of this coupon
                for (var j in applied) {
                    if (applied[j].partner_id[0] == client.id &&
                        applied[j].coupon_pos == coupon.code) {
                        applied[j].number_pos += 1;
                        already_used = true;
                        break;
                    }
                }
                // If this coupon is used for the first time by this customer
                // Memorize it's been used once
                if (!already_used) {
                    var temp = {
                        'partner_id': [client.id, client.name],
                        'number_pos': 1,
                        'coupon_pos': coupon.code
                    };
                    self.pos.applied_coupon.push(temp);
                }
                self.$('.coupon_work').hide();
                self.$('.footer').hide();
                self.$('.coupon_applied').show();
                setTimeout(function(){self.gui.close_popup();}, 2000);
            });
        },
        /**
            Checks that the code entered is valid.
            Also manage :
                - messages regarding coupon validity
                - showing/hiding 'apply' button
        **/
        validate_code: function(){
            var self = this;
            self.last_validated_coupon = null;
            var current_order = self.pos.get_order();
            var coupon = $(".coupon_code").val();
            if (current_order.orderlines.models.length == 0){
                self.display_error('No products !', 'You cannot apply coupon without products.', true);
            }
            else if(coupon){
                if(self.pos.get_client()){
                    var flag = true;
                    var customer = self.pos.get_client();
                    var coupon_and_voucher_found = find_coupon(coupon, self.pos.coupons, self.pos.vouchers);

                    var found_coupon = coupon_and_voucher_found[0];
                    var found_voucher = coupon_and_voucher_found[1];

                    self.flag = false;
                    self.display_message("");
                    if(coupon_and_voucher_found){

                        // Is voucher valid ?
                        var is_voucher_valid = self.check_voucher_validity(found_voucher, self.pos);

                        // Voucher is valid.
                        if(is_voucher_valid){
                            // Can this particular coupon be applied ?
                            var is_coupon_valid = self.check_coupon_validity(found_coupon, self.pos);

                            if(is_coupon_valid){
                                self.flag = true;
                                /* DEBUG purpose

                                var message = "Voucher value : ";
                                if(found_coupon['type'] == 'percentage') message += found_coupon['voucher_val'] + "%";
                                else message += self.format_currency(found_coupon['voucher_val']);
                                message += "<br/>Do you want to proceed ?"
                                message += "<br/><br/> This operation cannot be reversed."
                                self.display_message(message);*/

                                return found_coupon;
                            }
                        }
                    } else {
                        self.display_message("Code invalid. Try again");
                    }
                }
                else{
                    self.display_message("Please select a customer before applying any coupon");
                }
            }
        },
        /**
        *   Returns true if :
            - expiry_date is not reached yet
            - this vouchers applies to the current product
            Otherwise, returns false

            @param {object} voucher : the voucher tested
            @param {object} pos     : current context (widget.pos)
        **/
        check_voucher_validity: function(voucher, pos){
            var self = this;

            var today = moment().format('YYYY-MM-DD');
            var is_date_valid = is_between(today, null, voucher.expiry_date);
            if(!is_date_valid){
                self.display_message("Voucher is expired.");
                return false;
            }

            switch(voucher.voucher_type){
                case 'all' :
                    return true;

                // at least one product (which is not a return) in the cart matches the required product
                case 'product':
                    var order_lines = pos.get_order().orderlines.models;
                    for(var i in order_lines){
                        if(order_lines[i].product.id == voucher.product_id[0] && order_lines[i].quantity >= 0) return true;
                    }
                    self.display_message("This coupon requires the customer to buy at least one " + voucher.product_id[1] + ".");
                    break;

                // at least one product category (which is not a return) from the cart matches the required category
                case 'category':
                    var order_lines = pos.get_order().orderlines.models;
                    for(var i in order_lines){
                        if(order_lines[i].product.pos_categ_id[0] == voucher.product_categ[0] && order_lines[i].quantity >= 0) return true;
                    }
                    self.display_message("This coupon requires the customer to buy at least one " + voucher.product_categ[1] + " product.");
                    break;
                default:
                    return false;
            }
            return false;
        },
        /**
        *   Returns true if :
            - today is in validity dates interval [start_date, end_date]
            - this coupon is still available
            - this coupon is allowed for current customer
            - this customer hasn't already used all his coupons (maximum allowed per user)

            Otherwise, returns false

            @param {object} coupon : the coupon tested
            @param {object} pos    : current context (widget.pos)
        **/
        check_coupon_validity: function(coupon, pos){
            var self = this;

            var today = moment().format('YYYY-MM-DD');
            var is_date_valid = is_between(today, coupon.start_date, coupon.end_date);
            if(!is_date_valid){
                self.display_message("This coupon is expired.");
                return false;
            }

            // Is this coupon still available ?
            if(coupon.total_avail <= 0){
                self.display_message("No more codes left.");
                return false;
            }

            // Is this coupon dedicated to a customer ?
            // Is the current customer the required customer ?
            if(coupon.partner_id && coupon.partner_id[0] != pos.get_client().id){
                self.display_message("This coupon is dedicated to " + coupon.partner_id[1] + ".");
                return false;
            }

            // Has the current customer reached the maximum coupon allowed per user ?
            if(coupon.limit){
                var applied_coupons = pos.applied_coupon;
                for(var i in applied_coupons){
                    if(applied_coupons[i].partner_id[0] == pos.get_client().id && applied_coupons[i].number_pos >= coupon.limit){
                        self.display_message("Maximum codes (" + coupon.limit + ") already reached for this customer.");
                        return false;
                    }
                }
            }

            return true;
        },
        /**
            Display info message within the popup

            @param {string} message : html content message
        **/
        display_message: function(message){
            // FIXME $(".coupon_message").html(message);
            var self = this;
            self.$(".coupon_status").show();
            self.$(".coupon_message").html(message);
            self.$(".coupon_code").addClass("red");
        },
        /**
            Display an error popup

            @param {string}     title       : the popup title
            @param {string}     message     : the popup body message
            @param {boolean}    close_popup : to close the current popup before showing the error message
        **/
        display_error: function(title, message, close_popup){
            var self = this;
            if(close_popup) self.gui.close_popup();
            self.gui.show_popup('error', {'title': _t(title), 'body': _t(message)});
        },
    });
    gui.define_popup({name:'coupon', widget: CouponPopupWidget});

    // PosModel is extended to store vouchers, & coupon details
    pos_model.PosModel = pos_model.PosModel.extend({
        initialize: function(session, attributes) {
            PosModelSuper.prototype.initialize.call(this, session, attributes)
            this.vouchers = [''];
            this.applied_coupon = [];
        },
    });

    pos_model.Order = pos_model.Order.extend({
        initialize: function(attributes,options){
            return OrderSuper.prototype.initialize.call(this, attributes,options);
        },
        set_coupon: function (coupon) {
            this.coupon = coupon;
        },
        export_as_JSON: function () {
            var self = OrderSuper.prototype.export_as_JSON.call(this);
            self.coupon = this.coupon;
            return self;
        },
        init_from_JSON: function(json) {
            this.coupon = json.coupon;
            OrderSuper.prototype.init_from_JSON.call(this, json);
        },
    });
});