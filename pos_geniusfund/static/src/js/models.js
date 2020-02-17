odoo.define('pos_geniusfund.models', function (require) {
  "use strict";

    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');    
    var utils = require('web.utils');
    var round_pr = utils.round_precision;

    var ajax = require('web.ajax');
    var PosDB = require('point_of_sale.DB');
    var devices = require('point_of_sale.devices');
    var concurrency = require('web.concurrency');
    var config = require('web.config');
    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var rpc = require('web.rpc');
    var session = require('web.session');
    var time = require('web.time');
    var utils = require('web.utils');

    var QWeb = core.qweb;
    var _t = core._t;
    var Mutex = concurrency.Mutex;
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;

    var exports = {};var BarcodeParser = require('barcodes.BarcodeParser');

    // ILO add some fields in profile
    // x_studio_mmic, x_studio_avg_receipt, x_studio_total_visits,
    // x_studio_first_visit, x_studio_last_visit, x_studio_last_location_id
    models.load_fields('res.partner', ['x_studio_mmic', 'x_studio_avg_receipt',
                                       'x_studio_total_visits', 'x_studio_first_visit',
                                       'x_studio_last_visit', 'x_studio_last_location_id',
                                       'x_studio_concentrate', 'x_studio_thc_products_today', 'x_studio_last_visit','x_studio_date_of_birth','x_studio_mmic_status','create_date',
                                       'flag']);
    models.load_fields('product.product', ['x_studio_thc_content_g']);

    // Load sequence to be able to sort taxes in the receipt
    models.load_fields('account.tax', ['sequence']);

    // Load state_id to process THC limit (which depends on the state)
    models.load_fields('res.company', ['state_id']);
    models.load_models([
    {
        model: 'x_mjlimits',
        fields: ['x_name','x_RegLimit','x_RegLimitC','x_state_id','x_MedicalLimit','x_MedLimitC'],
        domain: null,
        loaded: function(self,limits){
            self.db.genius_thc_limits = limits;
        },
    }]);

    var _super_order = models.Order;
    models.Order = models.Order.extend({

        get_subtotal : function(){
            // Override to convert value in float
            return round_pr(this.orderlines.reduce((function(sum, orderLine){
                return parseFloat(sum) + parseFloat(orderLine.get_display_price());
            }), 0), this.pos.currency.rounding);
        },

        get_quantities: function(){

            return round_pr(this.orderlines.reduce((function(sum, orderLine) {
                return sum + orderLine.get_quantity();
            }), 0), this.pos.currency.rounding);

        },
        get_thc_quantities: function(){

            var thc_quant = 0;

            this.orderlines.each(function(orderline){
                if(orderline.get_categ_id() == 8){
                    thc_quant += orderline.get_quantity() * orderline.get_thc_quantity();
                }
            });
            return thc_quant;

        },
        get_concentrate_quantities: function(){

            var concentrate_quant = 0;
            this.orderlines.each(function(orderline){
                if(orderline.get_categ_id() == 9){
                    concentrate_quant += orderline.get_quantity() * orderline.get_thc_quantity();
                }
            });
            return concentrate_quant;
        },

        get_tax_details: function(){
            var tax_details = _super_order.prototype.get_tax_details.apply(this,arguments);//export_for_printing
            var tax_details = tax_details.sort(function(taxDetail1,taxDetail2){return taxDetail1.tax.sequence - taxDetail2.tax.sequence;});
            return tax_details;
        },

        get_fiscal_position: function(){
            // client has a fiscal position set
            if(this.get_client() && this.get_client().property_account_position_id && this.get_client().property_account_position_id.length > 0){
                // and it matches one of the fiscal position in the POS settings
                // then return the fiscal position from the POS settings
                for(var i=0; i< this.pos.fiscal_position_taxes.length; i++){
                    if(this.pos.fiscal_position_taxes[i].position_id[0] == this.get_client().property_account_position_id[0]) return this.pos.fiscal_position_taxes;
                }
            }

            return null;
        },

        // Returns true only if ALL THC products have a price > 0
        has_valid_prices: function(){
            var is_valid = true;
            this.orderlines.each(function(orderline){
                is_valid &= orderline.has_valid_price();
            });
            return is_valid;
        },

        /**
        *   Returns the base price without any discount
        **/
        get_original_price: function(){
            var rounding = this.pos.currency.rounding;
            var original_price = 0;
            this.orderlines.each(function(orderline){
                original_price += orderline.get_unit_price() * orderline.get_quantity();
            });
            return round_pr(original_price, rounding);
        },

        get_total_discount: function() {
            return round_pr(this.orderlines.reduce((function(sum, orderLine) {
                return sum + orderLine.get_total_discount();
            }), 0), this.pos.currency.rounding);
        },

        get_total_with_tax: function() {
            //Override to fix the decimal digits
            var total = parseFloat(this.get_total_without_tax()) + parseFloat(this.get_total_tax())
            return parseFloat(total).toFixed(2);
        },

        set_pricelist: function (pricelist) {
            var self = this;
            this.pricelist = pricelist;

            var lines_to_recompute = _.filter(this.get_orderlines(), function (line) {
                return ! line.price_manually_set;
            });
            _.each(lines_to_recompute, function (line) {
                line.set_new_price(line.product.get_price(self.pricelist, line.get_quantity()), false);
            });
            this.trigger('change');
        },

    });

    var _super_orderline = models.Orderline;
    models.Orderline = models.Orderline.extend({

        initialize: function(attributes,options){
            this.is_removable = true;
            return _super_orderline.prototype.initialize.call(this, attributes,options);
        },
        export_as_JSON: function () {
            var self = _super_orderline.prototype.export_as_JSON.call(this);
            self.is_removable = this.is_removable;
            return self;
        },
        init_from_JSON: function(json) {
            this.is_removable = json.is_removable;
            _super_orderline.prototype.init_from_JSON.call(this, json);
        },

        is_thc_product: function(){
            return this.get_product().x_studio_thc_content_g > 0;
        },
        get_thc_quantity: function(){
            return this.is_return() ? 0 : this.get_product().x_studio_thc_content_g;
        },
        get_concentrate_quantity: function(){
            return this.is_return() ? 0 : this.get_product().x_studio_thc_content_g;
        },
        get_categ_id: function(){
            return this.get_product().categ_id[0];
        },
        is_return: function(){
            return this.get_quantity() < 0;
        },

        /** Returns true only if orderline price > 0 for THC product
        *   It is not allowed to sell THC products for free
        **/
        has_valid_price: function(){
            return !(this.is_thc_product() && this.get_price_without_tax() == 0);
        },

        /**
        * Computes the taxes on an orderline including the excise tax specifity (which requires the original price)
        **/
        compute_all: function(taxes, original_price, discount_price, quantity, currency_rounding, no_map_tax) {
            var self = this;
            var list_taxes = [];
            var currency_rounding_bak = currency_rounding;
            if (this.pos.company.tax_calculation_rounding_method == "round_globally"){
               currency_rounding = currency_rounding * 0.00001;
            }
            var total_excluded = round_pr(discount_price * quantity, currency_rounding);
            var total_included = total_excluded;
            var base = total_excluded;
            _(taxes).each(function(tax) {
                if (!no_map_tax){
                    tax = self._map_tax_fiscal_position(tax);
                }
                if (!tax){
                    return;
                }
                if (tax.amount_type === 'group'){
                    var ret = self.compute_all(tax.children_tax_ids, original_price, discount_price, quantity, currency_rounding);
                    total_excluded = ret.total_excluded;
                    base = ret.total_excluded;
                    total_included = ret.total_included;
                    list_taxes = list_taxes.concat(ret.taxes);
                }
                else {
                    // is excise tax
                    var is_excise_tax = tax.name.toLowerCase().indexOf("excise") !== -1;
                    var tax_amount = is_excise_tax ? self._compute_all(tax, round_pr(original_price * quantity, currency_rounding), quantity) : self._compute_all(tax, base, quantity);

                    //var tax_amount = self._compute_all(tax, base, quantity);
                    tax_amount = round_pr(tax_amount, currency_rounding);

                    if (tax_amount){
                        if (tax.price_include) {
                            total_excluded -= tax_amount;
                            base -= tax_amount;
                        }
                        else {
                            total_included += tax_amount;
                        }
                        if (tax.include_base_amount) {
                            base += tax_amount;
                        }
                        var data = {
                            id: tax.id,
                            amount: tax_amount,
                            name: tax.name,
                        };
                        list_taxes.push(data);
                    }
                }
            });
            return {
                taxes: list_taxes,
                total_excluded: round_pr(total_excluded, currency_rounding_bak),
                total_included: round_pr(total_included, currency_rounding_bak)
            };
        },

        _map_tax_fiscal_position: function(tax) {
            var current_order = this.pos.get_order();
            var order_fiscal_position = current_order && current_order.get_fiscal_position();

            if (order_fiscal_position) {
                var mapped_tax = _.find(order_fiscal_position, function (fiscal_position_tax) {
                    return fiscal_position_tax.tax_src_id[0] === tax.id;
                });

                if (mapped_tax) {
                    tax = this.pos.taxes_by_id[mapped_tax.tax_dest_id[0]];
                }
            }

            return tax;
        },

        get_all_prices: function(){
            var price_unit = this.get_unit_price() - this.get_unit_discount();
            var taxtotal = 0;

            var product =  this.get_product();
            var taxes_ids = product.taxes_id;
            var taxes =  this.pos.taxes;
            var taxdetail = {};
            var product_taxes = [];

            _(taxes_ids).each(function(el){
                product_taxes.push(_.detect(taxes, function(t){
                    return t.id === el;
                }));
            });

            var all_taxes = this.compute_all(product_taxes, this.get_unit_price(), price_unit, this.get_quantity(), this.pos.currency.rounding, false);
            _(all_taxes.taxes).each(function(tax) {
                taxtotal += tax.amount;
                taxdetail[tax.id] = tax.amount;
            });

            return {
                "priceWithTax": all_taxes.total_included,
                "priceWithoutTax": (this.is_thc_product() && all_taxes.total_excluded == 0) ? 0.01 * this.get_quantity() : all_taxes.total_excluded,
                "tax": taxtotal,
                "taxDetails": taxdetail,
            };
        },

        get_discount_str: function(){
            //Override to fix the decimal digits of discount
            return (parseFloat(this.discountStr).toFixed(2)).toString();
        },

        get_total_discount: function(){
            return this.get_unit_discount() * this.get_quantity();
        },

        get_base_price: function(){
            var rounding = this.pos.currency.rounding;
            var base_price = round_pr(this.get_unit_price() - this.get_unit_discount(), rounding);
            if (this.get_quantity() < 0){
                return (this.is_thc_product() && base_price == 0) ? 0.01 * this.get_quantity() : -(base_price);
            }
            else{
                return (this.is_thc_product() && base_price == 0) ? 0.01 * this.get_quantity() : base_price;
            }
        },

        get_unit_discount: function(){
            var rounding = this.pos.currency.rounding;
            var discount_amount = round_pr(this.get_unit_price() * this.get_discount()/100, rounding);
            return (this.is_thc_product() && discount_amount == this.get_unit_price()) ? discount_amount - 0.01 : discount_amount;
        },

        get_unit_price: function(){
            return (this.product && this.product.lst_price) ? this.product.lst_price : 0;
        },

        set_unit_price: function(price){
            var original_price = this.get_unit_price();
            if(!this.price) _super_orderline.prototype.set_unit_price.apply(this,[original_price]);

            if(this.price_manually_set || price != original_price) {
                this.set_new_price(price);
            } else {
                _super_orderline.prototype.set_unit_price.apply(this,arguments);
            }
        },

        /**
        *   Estimate % discount based on the new price
        *   Set discount to estimated discount %
        **/
        set_new_price: function(new_value, price_manually_set){
            if(this.price_manually_set && price_manually_set || !this.price_manually_set){
                var new_value = parseFloat(new_value);
                var old_value = parseFloat(this.get_unit_price());
                var estimated_discount = 100 - new_value * 100 / old_value;
                this.set_discount(estimated_discount.toFixed(2));
                if(price_manually_set) this.price_manually_set = true;
            }
        },

        get_quantity_str_with_unit: function(){
            //Override to fix the decimal digits
            var unit = this.get_unit();
            var quantity =  parseFloat(this.quantityStr).toFixed(2)
            if(unit && !unit.is_pos_groupable){
                return quantity.toString() + ' ' + unit.name;
            }else{
                return quantity.toString();
            }
        },

        get_display_price: function(){
            //Override to fix the decimal digits
            if (this.pos.config.iface_tax_included === 'total') {
                return parseFloat(this.get_price_with_tax()).toFixed(2)
            } else {
                return parseFloat(this.get_base_price()).toFixed(2);
            }
        },

    });

    var _super_product = models.Product;
    models.Product = models.Product.extend({
        get_price: function(pricelist, quantity){
            // Override to round the product price to 2 decimal precision
            var self = this;
            var date = moment().startOf('day');

            // In case of nested pricelists, it is necessary that all pricelists are made available in
            // the POS. Display a basic alert to the user in this case.
            if (pricelist === undefined) {
                alert(_t(
                    'An error occurred when loading product prices. ' +
                    'Make sure all pricelists are available in the POS.'
                ));
            }

            var category_ids = [];
            var category = this.categ;
            while (category) {
                category_ids.push(category.id);
                category = category.parent;
            }

            var pricelist_items = _.filter(pricelist.items, function (item) {
                return (! item.product_tmpl_id || item.product_tmpl_id[0] === self.product_tmpl_id) &&
                       (! item.product_id || item.product_id[0] === self.id) &&
                       (! item.categ_id || _.contains(category_ids, item.categ_id[0])) &&
                       (! item.date_start || moment(item.date_start).isSameOrBefore(date)) &&
                       (! item.date_end || moment(item.date_end).isSameOrAfter(date));
            });

            var price = self.lst_price;
            _.find(pricelist_items, function (rule) {
                if (rule.min_quantity && quantity < rule.min_quantity) {
                    return false;
                }

                if (rule.base === 'pricelist') {
                    price = self.get_price(rule.base_pricelist, quantity);
                } else if (rule.base === 'standard_price') {
                    price = self.standard_price;
                }

                if (rule.compute_price === 'fixed') {
                    price = rule.fixed_price;
                    return true;
                } else if (rule.compute_price === 'percentage') {
                    price = price - (price * (rule.percent_price / 100));
                    return true;
                } else {
                    var price_limit = price;
                    price = price - (price * (rule.price_discount / 100));
                    if (rule.price_round) {
                        price = round_pr(price, rule.price_round);
                    }
                    if (rule.price_surcharge) {
                        price += rule.price_surcharge;
                    }
                    if (rule.price_min_margin) {
                        price = Math.max(price, price_limit + rule.price_min_margin);
                    }
                    if (rule.price_max_margin) {
                        price = Math.min(price, price_limit + rule.price_max_margin);
                    }
                    return true;
                }

                return false;
            });

            // This return value has to be rounded with round_di before
            // being used further. Note that this cannot happen here,
            // because it would cause inconsistencies with the backend for
            // pricelist that have base == 'pricelist'.
            return price.toFixed(2);
        },
    });

});
