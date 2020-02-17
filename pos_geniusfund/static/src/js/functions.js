/*
Pour accéder aux objets du POS :
this.posmodel....
this.odoo...
ou si c'est possible les faire passer par la fonction
*/

function pos_genius_customer(){
    this.posmodel.gui.show_screen('clientlist');
}
function pos_genius_customer_orders(){
    this.posmodel.gui.show_screen('ScreenCustomerOrders');
}
function pos_genius_return(){
    /* Oginal function :
    var orders = this.pos.orders;
    this.gui.show_screen('orderlist',{orders:orders});
    */

    var order = this.posmodel.get('selectedOrder');
    //Redirects to client screen if client is not selected
    if(order.get_client() == null){
        this.posmodel.gui.show_screen('clientlist');
    }else{
        // Get orders related to the selected customer
        var orders = this.posmodel.orders;
        var client = order.get_client();
        var result = [];
        for(var ord in orders) {
            if (orders[ord]['partner_id'] && orders[ord]['partner_id'][0] == client['id']){
                result.push(orders[ord])
            }
        }
        this.posmodel.gui.show_screen('orderlist',{orders:result});
    }
}

function pos_genius_add_notes(){
    this.posmodel.gui.show_popup(
        'NotesPopup',
        {
            'title': 'Notes',
            'body': '<textarea name="customer_note"></texarea>',
        }
    );
}
function pos_genius_see_profile(){
    this.posmodel.gui.show_popup(
        'ProfilePopup',
        {
            'title': 'Profile',
            'body': 'test',
        }
    );
    $(".pos .modal-dialog .popup").css({"height":"515px"});
    $(".pos .modal-dialog .popup .selection").css({"max-height":"510px"});
}

function pos_genius_manager_login(){

    var pos = this.posmodel;
    pos.manager = null;


    pos.gui.show_popup('GeniusPasswordPopupWidget', {
        'title': 'Manager Pin Code',
        init: function(parent, args) {
            this._super(parent, args);

        },
        validate: function(password){
            for (var i = 0; i < pos.users.length; i++) {
                if (password === pos.users[i].pos_security_pin) {
                    pos.manager = pos.users[i];
                    console.log('manager');
                    console.log(pos.manager);
                    break;
                }
            }

            if(pos.manager){
                $('#manager-login').hide();
                $('#manager-logout').show();
                $('#btn-return').show();
                $('#popup-validation-error').hide();
                pos_genius_show_manager_actionpad();
            } else {
                this.show_error('Invalid Pin Code');
                pos_genius_show_regular_actionpad();
            }

            return pos.manager != null;
        }
    });
}

function pos_genius_show_manager_actionpad(){
    $('.actionpad').hide();
    $('.numpad',$(this.posmodel.gui.current_screen)[0].el).show();
}

function pos_genius_show_regular_actionpad(){
    $('.numpad',$(this.posmodel.gui.current_screen)[0].el).hide();
    $('.actionpad').show();
}

function pos_genius_manager_logout(){
    var pos = this.posmodel;
    pos.manager = null;

    pos_genius_show_regular_actionpad();

    $('#manager-logout').hide();
    $('#btn-return').hide();
    $('#manager-login').show();
}

function set_gauge_thc_value(value, maximum){
    var gauge_thc = Math.min(parseFloat(100*value/maximum).toFixed(2),100);
    $('.thc_gauge').attr('aria-valuenow', gauge_thc).css('width', gauge_thc + '%');
}

function set_gauge_concentrate_value(value, maximum){
    var gauge_concentrate = Math.min(parseFloat(100*value/maximum).toFixed(2),100);
    $('.concentrate_gauge').attr('aria-valuenow', gauge_concentrate).css('width', gauge_concentrate + '%');
}



function get_age(dob){
    if(dob){
        var birthday = new Date(dob);
        var ageDifMs = Date.now() - birthday.getTime();
        var ageDate = new Date(ageDifMs); // miliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }else{
        return false;
    }

}
function get_since(date_creation){

    var date1 = new Date(date_creation);
    var date2 = new Date();

    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Do we display only the days ?

    if(diffDays){
        return diffDays + ' days';
    }

}
function get_today_date(){

    var d = new Date();
    var day = d.getDate() > 9 ? d.getDate() : '0' + d.getDate();
    var m = d.getMonth() + 1;
    var month = m > 9 ? m : '0' + m;

    return d.getFullYear() + '-' + month + '-' + day;

}
function get_formated_date(the_date){

    var iso_date = the_date.replace(/\s/, 'T');
    var d = new Date(iso_date);
    var day = d.getDate() > 9 ? d.getDate() : '0' + d.getDate();
    var m = d.getMonth() + 1;
    var month = m > 9 ? m : '0' + m;

    return month + '/' + day + '/' + d.getFullYear();

}
function get_formated_hour(the_date){

    var iso_date = the_date.replace(/\s/, 'T');
    var d = new Date(iso_date);
    var hours    = d.getHours() > 9 ? d.getHours() : '0' + d.getHours();
    var minutes  = d.getMinutes() > 9 ? d.getMinutes() : '0' + d.getMinutes();
    var seconds  = d.getSeconds() > 9 ? d.getSeconds() : '0' + d.getSeconds();

    return hours + ':' + minutes + ':' + seconds;

}

var viewport_width = $(window).width();
var viewport_height = $(window).height();

//alert('Viewport is ' + viewport_width + ' x ' + viewport_height);
