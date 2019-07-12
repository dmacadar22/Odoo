odoo.define('stock_barcode_ext.picking_client_action', function (require) {
    "use strict";

    var _rpc = require('web.rpc');
    var ajax = require('web.ajax');
    var core = require('web.core');
    var ClientAction = require('stock_barcode.ClientAction');
    var LinesWidget = require('stock_barcode.LinesWidget');
    var PickingClientAction = require('stock_barcode.picking_client_action');
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

        /**
         *
         */
        _isReservationProcessedLine: function ($line) {
            var qties = $line.find('.o_barcode_scanner_qty').text();
            qties = qties.split('/');
            if (parseInt(qties[0], 10) < parseInt(qties[1], 10)) {
                return -1;
            } else if (parseInt(qties[0], 10) === parseInt(qties[1], 10)) {
                return 0;
            } else {
                return 1;
            }
        },

        /**
         * Removes the highlight on the lines.
         */
        clearLineHighlight: function () {
            var $body = this.$el.filter('.o_barcode_lines');
            // Remove the highlight from the other line.
            $body.find('.o_highlight').removeClass('o_highlight');
        },

        /**
         * Highlight on the lines
         */
        _highlightLine: function ($line, doNotClearLineHighlight) {
            var $body = this.$el.filter('.o_barcode_lines');
            if (!doNotClearLineHighlight) {
                this.clearLineHighlight();
            }
            // Highlight `$line`.
            $line.toggleClass('o_highlight', true);
            $line.parents('.o_barcode_lines').toggleClass('o_js_has_highlight', true);

            var isReservationProcessed;
            if ($line.find('.o_barcode_scanner_qty').text().indexOf('/') === -1) {
                isReservationProcessed = false;
            } else {
                isReservationProcessed = this._isReservationProcessedLine($line);
            }
            if (isReservationProcessed === 1) {
                $line.toggleClass('o_highlight_green', false);
                $line.toggleClass('o_highlight_red', true);
            } else {
                $line.toggleClass('o_highlight_green', true);
                $line.toggleClass('o_highlight_red', false);
            }

            // Scroll to `$line`.
            $body.animate({
                scrollTop: $body.scrollTop() + $line.position().top - $body.height() / 2 + $line.height() / 2
            }, 500);

        },

        _incrementLines: function (params) {
            var self = this;
            var line = this._findCandidateLineToIncrement(params);
            var $body = self.$el.find('.o_barcode_lines');

            console.log('paramestos ', params);
            console.log('Linea encontrada', line);
            var isNewLine = false;
            if (line) {
                var $line = self.$("[data-id='" + line.id + "']");
                if (typeof line.virtual_id === "string"){
                    $line = self.$("[data-id='" + line.virtual_id + "']");
                }

                // Update the line with the processed quantity.
                if (params.product.tracking === 'none' ||
                    params.lot_id ||
                    params.lot_name
                    ) {
                    if (this.actionParams.model === 'stock.picking') {
                        line.qty_done += params.product.qty || 1;
                        console.log('Ha entrado', line);
                        
                        $line.find('.oe_price_subtotal').val(line.price_subtotal);
                        $line.find('.oe_profit_margin').html(line.profit_margin);
                        $line.find('.oe_qty_done').val(line.qty_done);

                        if (typeof line.id === "number"){
                            console.log(" vamos a ver");
                            self._rpc({
                                model: 'stock.move.line',
                                method: 'get_write_values',
                                args: [line.id],
                            }).then(function (data) {
                                console.log(data, 'data');
                                if (data.qty_done !== undefined) {
                                    $line.find('.oe_qty_done').val(data.qty_done + 1);
                                }
                            });
                        }


                    } else if (this.actionParams.model === 'stock.inventory') {
                        line.product_qty += params.product.qty || 1;
                    }
                }
            } else {
                isNewLine = true;
                // Create a line with the processed quantity.
                if (params.product.tracking === 'none' ||
                    params.lot_id ||
                    params.lot_name
                    ) {
                    line = this._makeNewLine(params.product, params.barcode, params.product.qty || 1, params.package_id, params.result_package_id);
                } else {
                    line = this._makeNewLine(params.product, params.barcode, 0, params.package_id, params.result_package_id);
                }
                this._getLines(this.currentState).push(line);
                this.pages[this.currentPageIndex].lines.push(line);
            }
            if (this.actionParams.model === 'stock.picking') {
                if (params.lot_id) {
                    line.lot_id = [params.lot_id];
                }
                if (params.lot_name) {
                    line.lot_name = params.lot_name;
                }
            } else if (this.actionParams.model === 'stock.inventory') {
                if (params.lot_id) {
                    line.prod_lot_id = [params.lot_id, params.lot_name];
                }
            }
            return {
                'id': line.id,
                'virtualId': line.virtual_id,
                'lineDescription': line,
                'isNewLine': isNewLine,
            };
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
        //             }

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

        //         // Apply now the needed actions on the different widgets.
        //         if (self.scannedLines && self.scanned_location_dest) {
        //             self._endBarcodeFlow();
        //         }

        //         var linesActions = res.linesActions;
        //         def.always(function () {
        //             _.each(linesActions, function (action) {
        //                 console.log('log', action);
        //                 console.log('log', self.linesWidget);
        //                 action[0].apply(self.linesWidget, action[1]);
        //             });
                    
        //             // self._save().then(function () {});
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
            self._onClickSaveLine(ev);
        },

        _onQty: function (ev) {
            var self = this;
            var id = $(ev.target).parents('.o_barcode_line').data('id');
            var current = $(ev.currentTarget);
            current.attr('data-qty_done', current.val());
            this.qty_done = current.val();
            current.data('qty_done', current.val());
            self._onClickSaveLine(ev);
        },

        _onTotal: function (ev) {
            var self = this;
            var current = $(ev.currentTarget);
            var id_or_virtual_id = $(ev.target).parents('.o_barcode_line').data('id');
            var $line = self.$("[data-id='" + id_or_virtual_id + "']");
            var $partial_amount = self.$el.find('.oe_partial_amount_total');
            
            
            self.price_subtotal = current.val();
            current.attr('data-price_subtotal', current.val());
            current.data('price_subtotal', current.val());

            var vals = { };
            vals['price_subtotal'] = current.val();

            this.mutex.exec(function () {
                return self._save().then(function () {
                    var id = id_or_virtual_id;
                    // console.log(' id ', id);
                    if (typeof id === "string") {
                        var currentPage = self.pages[self.currentPageIndex];
                        var rec = _.find(currentPage.lines, function (line) {
                            return line.dummy_id === id;
                        });
                        id = rec.id;
                    }

                    $line.attr('data-id', id);
                    $line.data('id', id);
                    $line = self.$("[data-id='" + id + "']");

                    vals['id'] = id;

                    return self._rpc({
                        model: 'stock.move.line',
                        method: 'calculate_cost',
                        args: [vals],
                    }).then(function (res) {
                        self._rpc({
                            model: 'stock.move.line',
                            method: 'get_write_values',
                            args: [id],
                        }).then(function (data) {
                            
                            if (data.qty_done !== undefined) {
                                $line.find('.qty-done').html(data.qty_done);
                            }
                            if (data.profit_margin !== undefined) {
                                $line.find('.oe_profit_margin').html(data.profit_margin);
                            }
                            if (data.standard_price !== undefined) {
                                $line.find('.oe_standard_price').html('Cost ' + data.standard_price);
                            }
                            if (data.partial_amount_total !== undefined) {
                                $partial_amount.html(data.partial_amount_total);
                            }
                            
                            var $body = self.$el.filter('.o_barcode_lines');
                            self.$(".o_highlight").removeClass('o_highlight');
                            self._highlightLine($line);
                        });
                        
                    });
                });
            });



        },

        _onReload: function (ev) {
            this._super(ev);

            this.price_subtotal = -1;
            this.qty_done = -1;
            this.list_price = -1;
        },

        _onClickSaveLine: function (ev) {
            ev.stopPropagation();
            this.linesWidgetState = this.linesWidget.getState();
            console.log(ev);
            // If we want to edit a not yet saved line, keep its virtual_id to match it with the result
            // of the `applyChanges` RPC.
            // var virtual_id = _.isString(ev.data.id) ? ev.data.id : false;
            // console.log('virtual ', virtual_id);

            var self = this;
            var id_or_virtual_id = $(ev.target).parents('.o_barcode_line').data('id');
            var $line = self.$("[data-id='" + id_or_virtual_id + "']");
            var $partial_amount = self.$el.find('.oe_partial_amount_total');
            
            var vals = { };
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

                    var id = id_or_virtual_id;
                    // console.log(' id ', id);
                    if (typeof id === "string") {
                        var currentPage = self.pages[self.currentPageIndex];
                        var rec = _.find(currentPage.lines, function (line) {
                            return line.dummy_id === id;
                        });
                        id = rec.id;
                    }
                    
                    $line.attr('data-id', id);
                    $line.data('id', id);
                    $line = self.$("[data-id='" + id + "']");
                    
                    vals['id'] = id;
                    console.log('ides ' , id, $line);


                    self._rpc({
                        model: 'stock.move.line',
                        method: 'write_rpc',
                        args: [vals],
                    }).then(function (res) {
                        self._rpc({
                            model: 'stock.move.line',
                            method: 'get_write_values',
                            args: [id],
                        }).then(function (data) {
                            if (data.qty_done !== undefined) {
                                $line.find('.qty-done').html(data.qty_done);
                            }
                            if (data.profit_margin !== undefined) {
                                $line.find('.oe_profit_margin').html(data.profit_margin);
                            }
                            if (data.price_subtotal !== undefined) {
                                $line.find('.oe_price_subtotal').val(data.price_subtotal);
                            }
                            if (data.partial_amount_total !== undefined) {
                                $partial_amount.html(data.partial_amount_total);
                            }

                            var $body = self.$el.filter('.o_barcode_lines');
                            self.$(".o_highlight").removeClass('o_highlight');
                            self._highlightLine($line);

                        });
                    });
                });
            });
        },
    });

    PickingClientAction.include({
        _makeNewLine: function (product, barcode, qty_done, package_id, result_package_id) {
            var virtualId = this._getNewVirtualId();
            var currentPage = this.pages[this.currentPageIndex];
            var newLine = {
                'picking_id': this.currentState.id,
                'product_id': {
                    'id': product.id,
                    'display_name': product.display_name,
                    'barcode': barcode,
                    'tracking': product.tracking,
                    'standard_price': product.standard_price,
                    'list_price': product.list_price,
                },
                'product_barcode': barcode,
                'display_name': product.display_name,
                'product_uom_qty': 0,
                'product_uom_id': product.uom_id,
                'qty_done': qty_done,
                'price_subtotal': qty_done * product.standard_price,
                'list_price': product.list_price,
                'standard_price': product.standard_price,
                'location_id': {
                    'id': currentPage.location_id,
                    'display_name': currentPage.location_name,
                },
                'location_dest_id': {
                    'id': currentPage.location_dest_id,
                    'display_name': currentPage.location_dest_name,
                },
                'package_id': package_id,
                'result_package_id': result_package_id,
                'state': 'assigned',
                'reference': this.name,
                'virtual_id': virtualId,
            };
            console.log('Nueva linea ' , newLine);
            return newLine;
        },
    });
});