odoo.define('stock_barcode_ext.picking_client_action', function (require) {
    "use strict";

    var _rpc = require('web.rpc');
    var core = require('web.core');
    var ClientAction = require('stock_barcode.ClientAction');
    var LinesWidget = require('stock_barcode.LinesWidget');
    var _t = core._t;

    LinesWidget.include({
        init: function (parent, page, pageIndex, nbPages) {
            this._super.apply(this, arguments);
            this.amount_total = parent.currentState.amount_total;
            this.partial_amount_total = parent.currentState.partial_amount_total;
        }
    });

    ClientAction.include({
        events: _.extend({
            'click .o_save_line': '_onClickSaveLine',
            'change .oe_price_subtotal': '_onTotal',
            'change .oe_qty_done': '_onQty',
            'change .oe_list_price': '_onPrice',
        }),
        init: function (parent, action) {
            this._super.apply(this, arguments);

            this.price_subtotal = -1;
            this.qty_done = -1;
            this.list_price = -1;
        },

        // _onBarcodeScanned: function (barcode) {
        //     var self = this;
        //     return this.stepsByName[this.currentStep || 'source'](barcode, []).then(function (res) {
        //         /* We check now if we need to change page. If we need to, we'll call `this.save` with the
        //          * `new_location_id``and `new_location_dest_id` params so `this.currentPage` will
        //          * automatically be on the new page. We need to change page when we scan a source or a
        //          * destination location ; if the source or destination is different than the current
        //          * page's one.
        //          */
        //         var def = $.when();
        //         var currentPage = self.pages[self.currentPageIndex];
        //         if (
        //             (self.scanned_location &&
        //                 !self.scannedLines.length &&
        //                 self.scanned_location.id !== currentPage.location_id
        //             ) ||
        //             (self.scanned_location_dest &&
        //                 self.scannedLines.length &&
        //                 self.scanned_location_dest.id !== currentPage.location_dest_id
        //             )
        //         ) {
        //             // The expected locations are the scanned locations or the default picking locations.
        //             var expectedLocationId = self.scanned_location.id;
        //             var expectedLocationDestId;
        //             if (self.actionParams.model === 'stock.picking') {
        //                 expectedLocationDestId = self.scanned_location_dest &&
        //                     self.scanned_location_dest.id ||
        //                     self.currentState.location_dest_id.id;
        //                 // self._reloadLineWidget(self.currentPageIndex);
        //             }
        //
        //             if (expectedLocationId !== currentPage.location_id ||
        //                 expectedLocationDestId !== currentPage.location_dest_id
        //             ) {
        //                 var params = {
        //                     new_location_id: expectedLocationId,
        //                 };
        //                 if (expectedLocationDestId) {
        //                     params.new_location_dest_id = expectedLocationDestId;
        //                 }
        //                 def = self._save(params).then(function () {
        //                     self._reloadLineWidget(self.currentPageIndex);
        //                 });
        //             }
        //         }
        //
        //         // Apply now the needed actions on the different widgets.
        //         if (self.scannedLines && self.scanned_location_dest) {
        //             self._endBarcodeFlow();
        //         }
        //         var linesActions = res.linesActions;
        //         def.always(function () {
        //             _.each(linesActions, function (action) {
        //                 action[0].apply(self.linesWidget, action[1]);
        //                 // self._reloadLineWidget(self.currentPageIndex);
        //
        //             });
        //             // self._save({'forceReload': true}).then(function () {
        //             //     // self._reloadLineWidget(self.currentPageIndex);
        //             // });
        //             return $.when();
        //         });
        //         return def;
        //     }, function (errorMessage) {
        //         self.do_warn(_t('Warning'), errorMessage);
        //     });
        // },

        _onPrice: function (ev) {
            var self = this;
            var id = $(ev.target).parents('.o_barcode_line').data('id');
            var current = $(ev.currentTarget);
            current.attr('data-list_price', current.val());
            current.data('list_price', current.val());
            this.list_price = current.val();
            console.log($(ev.currentTarget).val());
        },

        _onQty: function (ev) {
            var self = this;
            var id = $(ev.target).parents('.o_barcode_line').data('id');
            var current = $(ev.currentTarget);
            current.attr('data-qty_done', current.val());
            this.qty_done = current.val();
            current.data('qty_done', current.val());
            console.log($(ev.currentTarget).val());
        },

        _onTotal: function (ev) {
            var self = this;
            var id = $(ev.target).parents('.o_barcode_line').data('id');
            var current = $(ev.currentTarget);
            self.price_subtotal = current.val();
            current.attr('data-price_subtotal', current.val());
            current.data('price_subtotal', current.val());
            console.log($(ev.currentTarget).val());
        },

        _onReload: function (ev) {
            this._super(ev);

            this.price_subtotal = -1;
            this.qty_done = -1;
            this.list_price = -1;
        },

        _onClickSaveLine: function (ev) {
            var self = this;

            var id = $(ev.target).parents('.o_barcode_line').data('id');
            var parent = $(ev.target).parent('.o_barcode_line');


            var price_subtotal = parent.find('oe_price_subtotal').data('price_subtotal');
            var qty_done = parent.find('oe_qty_done').data('qty_done');
            var list_price = parent.find('oe_list_price').data('list_price');

            var vals = {'id': id};
            if (this.price_subtotal !== -1) {
                vals['price_subtotal'] = this.price_subtotal
            }
            if (this.qty_done !== -1) {
                vals['qty_done'] = this.qty_done
            }
            if (this.list_price !== -1) {
                vals['list_price'] = this.list_price
            }

            this.mutex.exec(function () {
                return self._save().then(function () {
                    return self._rpc({
                        model: 'stock.move.line',
                        method: 'write_rpc',
                        args: [vals],
                    }).then(function (res) {
                        var def = $.when();
                        return def.then(function () {
                            return self.trigger_up('reload');
                        });
                    });
                });
            });
        },

    });
});