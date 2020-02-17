odoo.define('pos_geniusfund.genius-db', function (require) {
    "use strict";

    var PosDB = require('point_of_sale.DB');

    PosDB.include({

        sort_partners: function(partner_1, partner_2){
            if(!partner_1.name){
                partner_1.name = "";
            }
            if(!partner_2.name){
                partner_2.name = "";
            }

            return partner_1.name.toUpperCase().localeCompare(partner_2.name.toUpperCase());
        },

        genius_search_partner: function(query){
            console.log('genius_search_partner');
            try {
                query = query.replace(/[\[\]\(\)\+\*\?\.\-\!\&\^\$\|\~\_\{\}\:\,\\\/]/g,'.');
                query = query.replace(/ /g,'.+');
                var re = RegExp("([0-9]+):.*?"+query,"gi");
            }catch(e){
                return [];
            }
            var results = [];
            for(var i = 0; i < this.limit; i++){
                var r = re.exec(this.partner_search_string);
                if(r){
                    var id = Number(r[1]);
                    results.push(this.get_partner_by_id(id));
                }else{
                    break;
                }
            }

            return results;

        },

        /**
        *   Standard method overriden to add last_visit field to criteria
        **/
        _partner_search_string: function(partner){
            var str =  partner.name;
            if(partner.barcode){
                str += '|' + partner.barcode;
            }
            if(partner.address){
                str += '|' + partner.address;
            }
            if(partner.phone){
                str += '|' + partner.phone.split(' ').join('');
            }
            if(partner.mobile){
                str += '|' + partner.mobile.split(' ').join('');
            }
            if(partner.email){
                str += '|' + partner.email;
            }
            if(partner.vat){
                str += '|' + partner.vat;
            }
            // BEGIN SPECIFIC GENIUS
            if(partner.x_studio_last_visit){
                str += '|' + partner.x_studio_last_visit;
            }
            // END SPECIFIC GENIUS
            str = '' + partner.id + ':' + str.replace(':','') + '\n';
            return str;
        },

        /**
        *   Returns the x_mjlimit object with given state id
        **/
        _genius_get_thc_limit_by_state_id: function(state_id){
            var self = this;
            if(this.genius_thc_limits){
                for (var i = 0; i < this.genius_thc_limits.length; i++) {
                    var limit = this.genius_thc_limits[i];
                    if(state_id == limit.x_state_id[0]) return limit;
                }
            }
        }
        
    });
    
});
