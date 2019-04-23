odoo.define('pos_vantiv_tripos_cloud.pos_vantiv_tripos_cloud', function (require) {
    "use strict";

    var core = require('web.core');
    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var _db = require('point_of_sale.DB');
    var _t = core._t;
    var _super_order = models.Order.prototype;

    models.load_models({
        model: 'pos_vantiv_tripos_cloud.lane',
        fields: ['id', 'name', 'lane_id', ],
        loaded: function (self, lanes) {
            self.lanes = lanes;
            self.lanes_by_id = {};
            _.each(lanes, function (lane) {
                self.lanes_by_id[lane.id] = lane;
            });
        },
    });

    models.Order = models.Order.extend({
        initialize: function (session, attributes) {
            _super_order.initialize.call(this, session, attributes);
            this.lane_id = null;
        },
        set_lane: function (lane) {
            var self = this;
            self.lane_id = lane.id;
            console.log("set Lane id -->", self.lane_id);
            this.trigger('change');
        },
        clone: function () {
            var order = _super_order.clone.call(this);
            order.lane_id = this.lane_id;
            return order;
        },
        export_as_JSON: function () {
            var json = _super_order.export_as_JSON.call(this);
            json.lane_id = this.lane_id;
            console.log("export json =? ", json);
            return json;
        },
        init_from_JSON: function (json) {
            _super_order.init_from_JSON.apply(this, arguments);
            this.lane_id = json.lane_id;
            console.log("init Json => ", json);
            console.log("inti Json this => ", this);
        },
    });

    var TriposLaneButton = screens.ActionButtonWidget.extend({
        template: 'TriposLaneButton',
        init: function (parent, options) {
            this._super(parent, options);

            this.pos.get('orders').bind('add remove change', function () {
                this.renderElement();
            }, this);

            this.pos.bind('change:selectedOrder', function () {
                this.renderElement();
            }, this);
        },
        button_click: function () {
            var self = this;

            var lanes = _.map(self.pos.lanes, function (lane) {
                return {
                    label: lane.name,
                    item: lane
                };
            });

            self.gui.show_popup('selection', {
                title: _t('Select lane'),
                list: lanes,
                confirm: function (lane) {
                    var order = self.pos.get_order();
                    order.set_lane(lane);
                    console.log("confirm order 2 ", order);
                },
                is_selected: function (lane) {
                    var order = self.pos.get_order();
                    console.log("is selected ", order);
                    return lane.id === order.lane_id;
                }
            });
        },
        get_current_lane_name: function () {
            var name = _t('Select Lane');
            var order = this.pos.get_order();

            if (order) {
                var lane = order.lane_id;

                if (lane) {
                    name = this.pos.lanes_by_id[lane].name;
                }
            }
            return name;
        },
    });

    screens.define_action_button({
        'name': 'selectLane',
        'widget': TriposLaneButton,
    });

    return {
        TriposLaneButton: TriposLaneButton,
    };
});