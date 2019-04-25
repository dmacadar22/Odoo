odoo.define('pos_vantiv_tripos_cloud.pos_vantiv_tripos_cloud', function (require) {
    "use strict";

    var core = require('web.core');
    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var _db = require('point_of_sale.DB');
    var _rpc = require('web.rpc');
    var PopupWidget = require('point_of_sale.popups');
    var ScreenWidget = screens.ScreenWidget;
    var PaymentScreenWidget = screens.PaymentScreenWidget;
    var _t = core._t;
    var _super_order = models.Order.prototype;

    PaymentScreenWidget.include({
        server_timeout_in_ms: 95000,
        server_retries: 3,

        validate_order: function (force_validation) {
            var self = this;
            var order = this.pos.get_order();
            var def = new $.Deferred();
            var flag = false;
            var i = 0;
            var lines = order.get_paymentlines();
            var amount_total = 0;
            // var amount = self.pos.get_order().get_due();

            // var online = this.pos.getOnlinePaymentJournals();

            for (i = 0; i < lines.length; i++) {
                if (lines[i].cashregister.journal.type === 'bank') {
                    amount_total += lines[i].amount;
                    flag = true;
                }
            }
            var transaction = {
                'lane_id': self.pos.config.lane_id[0],
                'amount_total': amount_total,
            };
            // console.log('Flag ', flag);
            if (flag) {

                // console.log('THis => ', this);
                this._rpc({
                    model: 'pos_vantiv_tripos_cloud.transaction',
                    method: 'do_transaction',
                    args: [transaction], //Now gives the value of c.

                }).then(function (data) {
                    if (data['statusCode'] === "Approved") {
                        if (self.order_is_valid(force_validation)) {
                            self.finalize_validation();
                        }
                    } else if (data['statusCode'] === "Declined") {
                        def.resolve({
                            message: _t("Please setup your Mercury merchant account.")
                        });
                        return;

                    } else if (data['statusCode'] === "PinPadError") {
                        def.resolve({
                            message: _t("ERROR:A PIN pad exception occurred. No processor request attempted.")
                        });
                        return;
                    } else if (data === "lane not found") {
                        def.resolve({
                            message: _t("Lane not found.")
                        });
                        return;
                    } else {
                        def.resolve({
                            message: _t("Please setup your Vantiv merchant account.")
                        });
                        return;
                    }
                });
            } else {
                if (self.order_is_valid(force_validation)) {
                    self.finalize_validation();
                }
            }
        },
    });

    // models.load_models({
    //     model: 'pos_vantiv_tripos_cloud.lane',
    //     fields: ['id', 'name', 'lane_id', ],
    //     loaded: function (self, lanes) {
    //         self.lanes = lanes;
    //         self.lanes_by_id = {};
    //         _.each(lanes, function (lane) {
    //             self.lanes_by_id[lane.id] = lane;
    //         });
    //     },
    // });

    // models.Order = models.Order.extend({
    //     initialize: function (session, attributes) {
    //         _super_order.initialize.call(this, session, attributes);
    //         this.lane_id = 1;
    //     },
    //     set_lane: function (lane) {
    //         var self = this;
    //         self.lane_id = lane.id;
    //         this.trigger('change');
    //     },
    //     clone: function () {
    //         var order = _super_order.clone.call(this);
    //         order.lane_id = this.lane_id;
    //         return order;
    //     },
    //     export_as_JSON: function () {
    //         var json = _super_order.export_as_JSON.call(this);
    //         json.lane_id = this.lane_id;
    //         return json;
    //     },
    //     init_from_JSON: function (json) {
    //         _super_order.init_from_JSON.apply(this, arguments);
    //         this.lane_id = json.lane_id;
    //     },
    // });



    // var TriposLaneButton = screens.ActionButtonWidget.extend({
    //     template: 'TriposLaneButton',
    //     init: function (parent, options) {
    //         this._super(parent, options);

    //         this.pos.get('orders').bind('add remove change', function () {
    //             this.renderElement();
    //         }, this);

    //         this.pos.bind('change:selectedOrder', function () {
    //             this.renderElement();
    //         }, this);
    //     },
    //     button_click: function () {
    //         var self = this;

    //         var lanes = _.map(self.pos.lanes, function (lane) {
    //             return {
    //                 label: lane.name,
    //                 item: lane
    //             };
    //         });

    //         self.gui.show_popup('selection', {
    //             title: _t('Select lane'),
    //             list: lanes,
    //             confirm: function (lane) {
    //                 var order = self.pos.get_order();
    //                 order.set_lane(lane);
    //                 console.log("confirm order 2 ", order);
    //             },
    //             is_selected: function (lane) {
    //                 var order = self.pos.get_order();
    //                 console.log("is selected ", order);
    //                 return lane.id === order.lane_id;
    //             }
    //         });
    //     },
    //     get_current_lane_name: function () {
    //         var name = _t('Select Lane');
    //         var order = this.pos.get_order();

    //         if (order) {
    //             var lane = order.lane_id;

    //             if (lane) {
    //                 name = this.pos.lanes_by_id[lane].name;
    //             }
    //         }
    //         return name;
    //     },
    // });

    // screens.define_action_button({
    //     'name': 'selectLane',
    //     'widget': TriposLaneButton,
    // });

    // return {
    //     TriposLaneButton: TriposLaneButton,
    // };
});