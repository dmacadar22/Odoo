odoo.define("point_of_sale_logo.image", function (require) {
    "use strict";
    var PosBaseWidget = require('point_of_sale.chrome');
    var screens = require('point_of_sale.screens');
    var core = require('web.core');

    var QWeb = core.qweb;
    console.log("PosBaseWidget", PosBaseWidget)
    PosBaseWidget.Chrome.include({
        renderElement:function () {

            var self = this;
            console.log("self:", self)

            if(self.pos.config){
                if(self.pos.config.image){
                    this.flag = 1
                    this.a3 = window.location.origin + '/web/image?model=pos.config&field=image&id='+self.pos.config.id;
                }
            }
            this._super(this);
        }
    });
});
