odoo.define('star_pos_product_age_restriction.custom_models_js', function(require) {
    "use strict";

    var core = require('web.core');
    var rpc = require('web.rpc');
    var pos_models = require('point_of_sale.models');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var gui = require('point_of_sale.gui');
    var PopupWidget = require('point_of_sale.popups');

    var models = pos_models.PosModel.prototype.models;
    var _super_posmodel = pos_models.Order.prototype;

    var QWeb = core.qweb;
    var _t = core._t;


    var CustomerNotifyWidget = PopupWidget.extend({
        template: 'CustomerNotifyWidget',
        init: function(parent, args) {
            this._super(parent, args);
            this.options = {};
        },
        events: {
            'click .button.cancel': 'click_cancel',
            'click .button.confirm': 'click_confirm',
            'click .selection-item': 'click_item',
            'click .input-button': 'click_numpad',
            'click .mode-button': 'click_numpad',
        },

        // show the popup !  
        show: function(options) {
            if (this.$el) {
                this.$el.removeClass('oe_hidden');
            }

            if (typeof options === 'string') {
                this.options = {
                    title: options
                };
            } else {
                this.options = options || {};
            }

            this.renderElement();

            // popups block the barcode reader ... 
            if (this.pos.barcode_reader) {
                this.pos.barcode_reader.save_callbacks();
                this.pos.barcode_reader.reset_action_callbacks();
            }
        },

        // called before hide, when a popup is closed.
        // extend this if you want a custom action when the 
        // popup is closed.
        close: function() {
            if (this.pos.barcode_reader) {
                this.pos.barcode_reader.restore_callbacks();
            }
        },

        // hides the popup. keep in mind that this is called in 
        // the initialization pass of the pos instantiation, 
        // so you don't want to do anything fancy in here
        hide: function() {
            if (this.$el) {
                this.$el.addClass('oe_hidden');
            }
        },

        // what happens when we click cancel
        // ( it should close the popup and do nothing )
        click_cancel: function() {
            this.gui.close_popup();
            if (this.options.cancel) {
                this.options.cancel.call(this);
            }
        },

        // what happens when we confirm the action
        click_confirm: function() {
            this.gui.close_popup();
            if (this.options.confirm) {
                this.options.confirm.call(this);
            }
        },

        // Since Widget does not support extending the events declaration
        // we declared them all in the top class.
        click_item: function() {},
        click_numad: function() {},
    });
    gui.define_popup({
        name: 'customer_notify',
        widget: CustomerNotifyWidget
    });

    var POSTextInputPopupWidget = PopupWidget.extend({
        template: 'POSTextInputPopupWidget',
        show: function(options) {
            options = options || {};
            this._super(options);

            this.renderElement();
            this.$('input,textarea').focus();
        },
        click_confirm: function() {
            var value = this.$('input,textarea').val();
            this.gui.close_popup();
            if (this.options.confirm) {
                this.options.confirm.call(this, value);
            }
        },
    });
    gui.define_popup({
        name: 'POStextinput',
        widget: POSTextInputPopupWidget
    });

    var POSInfoPopupWidget = PopupWidget.extend({
        template: 'POSInfoPopupWidget',
        show: function(options) {
            this._super(options);
            this.gui.play_sound('error');
        },
    });
    gui.define_popup({
        name: 'simple_msg_info',
        widget: POSInfoPopupWidget
    });

    var POSErrorPopupWidget = PopupWidget.extend({
        template: 'POSErrorPopupWidget',
        show: function(options) {
            this._super(options);
            this.gui.play_sound('error');
        },
    });
    gui.define_popup({
        name: 'simple_msg_warning',
        widget: POSErrorPopupWidget
    });

    // models.load_fields('product.product', ['apply_age_limit', 'cust_minium_age']);
    pos_models.load_fields('product.product', ['apply_age_limit', 'cust_minimum_age']);

    // models.splice(18, 0, {
    //     model: 'product.product',
    //     // todo remove list_price in master, it is unused
    //     fields: ['display_name', 'list_price', 'lst_price', 'standard_price', 'categ_id', 'pos_categ_id', 'taxes_id',
    //         'barcode', 'default_code', 'to_weight', 'uom_id', 'description_sale', 'description',
    //         'product_tmpl_id', 'tracking', 'apply_age_limit', 'cust_minimum_age'
    //     ],
    //     order: _.map(['sequence', 'default_code', 'name'], function(name) {
    //         return {
    //             name: name
    //         };
    //     }),
    //     domain: [
    //         ['sale_ok', '=', true],
    //         ['available_in_pos', '=', true]
    //     ],
    //     context: function(self) {
    //         return {
    //             display_default_code: false
    //         };
    //     },
    //     loaded: function(self, products) {
    //         var using_company_currency = self.config.currency_id[0] === self.company.currency_id[0];
    //         var conversion_rate = self.currency.rate / self.company_currency.rate;
    //         self.db.add_products(_.map(products, function(product) {
    //             if (!using_company_currency) {
    //                 product.lst_price = round_pr(product.lst_price * conversion_rate, self.currency.rounding);
    //             }
    //             product.categ = _.findWhere(self.product_categories, {
    //                 'id': product.categ_id[0]
    //             });
    //             return new pos_models.Product({}, product);
    //         }));
    //     }
    // });

    pos_models.Order = pos_models.Order.extend({
        initialize: function(attributes, options) {
            this.customer_age = undefined;
            if (options && options.json && options.json.partner_id) {
                this.selected_customer = options.json.partner_id;
            }
            return _super_posmodel.initialize.call(this, attributes, options);
        },
        /*add_product: function(product, options) {
            var self = this;
            this.eligible_message = _t('You are eligible to purchase this product.');
            this.not_eligible_message = _t('Sorry you are under age.');

            var domain_age = [];
            var fields_age = ['eligible_message', 'not_eligible_message'];
            rpc.query({
                model: 'pos.demo.data.age',
                method: 'search_read',
                args: [domain_age, fields_age],
            }).then(function(res_conf) {
                if (res_conf && res_conf[0]) {
                    self.eligible_message = res_conf[0]['eligible_message'];
                    self.not_eligible_message = res_conf[0]['not_eligible_message'];
                }
            });
            if (product != undefined && product.product_tmpl_id != undefined) {
                var domain = [
                    ['product_tmpl_id', '=', product.product_tmpl_id]
                ];
                var fields = ['apply_age_limit', 'cust_minimum_age'];
                rpc.query({
                    model: 'product.product',
                    method: 'search_read',
                    args: [domain, fields],
                }).then(function(product_data) {
                    if (product_data && product_data[0].apply_age_limit == true) {
                        var customer_minimum_age = product_data[0].cust_minimum_age
                        if (self.customer_age === undefined) {
                            self.pos.gui.show_popup('customer_notify', {
                                'title': _t("Alert"),
                                'body': _t('The client seems older than ' + customer_minimum_age + ' year(s)?'),
                                confirm: function() {
                                    return _super_posmodel.add_product.call(self, product, options);
                                },
                                cancel: function() {
                                    self.pos.gui.show_popup('POStextinput', {
                                        'title': _t("Please Enter Customers Birthdate!"),
                                        confirm: function(data) {
                                            if (data) {
                                                var dob = new Date(data);
                                                var today = new Date();
                                                var age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
                                                self.customer_age = age;
                                                if (age >= customer_minimum_age) {
                                                    self.pos.gui.show_popup('simple_msg_info', {
                                                        'title': self.eligible_message,
                                                    });
                                                    return _super_posmodel.add_product.call(self, product, options);
                                                } else {
                                                    self.pos.gui.show_popup('simple_msg_warning', {
                                                        'title': self.not_eligible_message,
                                                    });
                                                }
                                            }
                                        },
                                    });
                                },
                            });
                        } else {
                            if (self.customer_age >= customer_minimum_age) {
                                return _super_posmodel.add_product.call(self, product, options);
                            } else {
                                self.pos.gui.show_popup('simple_msg_warning', {
                                    'title': self.not_eligible_message,
                                });
                            }
                        }
                    } else {
                        return _super_posmodel.add_product.call(self, product, options);
                    }
                });
            } else {
                return _super_posmodel.add_product.call(self, product, options);
            }
        },*/
    });

});
