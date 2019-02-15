odoo.define('pos_limit_product.DB', function (require) {
"use strict";

var PosDB = require('point_of_sale.DB');

PosDB.include({
    init: function(options){
        var options = options || {};
        options.limit = 300;
        this._super(options);
    },

});

});


