class Streamline {
    constructor() {
        this.allow_changing_user = false;

        this.user_screen = null;
        this.authentication_screen = null;
    }

    /**
        Initialize Streamline login process screens
    **/
    init(state, options) {
        var self = this;

        self.user_screen = new UserListScreen(self);
        self.authentication_screen = new AuthenticationScreen(self);

        $(self.user_screen).on(self.user_screen.USER_SELECTION_EVENT,function(){self.select_user();});

        $(self.authentication_screen).on(self.authentication_screen.CHANGE_USER_EVENT,function(){self.user_screen.show();});

        switch(state){
            case 'start':
                self.user_screen.show();
                break;
            case 'authentication':
                self.user_screen.select_user(options);
                break;
            default:
                self.user_screen.show();
        }
    }

    /**
        Select user and ask for pin code
    **/
    select_user(){
        var self = this;
        var user = self.user_screen.get_selected_user();

        self.authentication_screen.set_user(user);
        self.authentication_screen.show(self.allow_changing_user);
    }
}

class AuthenticationScreen {
    constructor(streamline) {
        this.SCREEN_ID = 'authentication_screen';
        this.CHANGE_USER_EVENT = 'change_user';
        this.AUTHENTICATION_SUCCESS_EVENT = 'authentication_success';
        this.streamline = streamline;
        this.reset_pin_code();

        this.user = null;

        var self = this;

        var back_button = $('#' + self.SCREEN_ID + ' .back');
        $(back_button).click(function(){
            $(self).trigger(self.CHANGE_USER_EVENT);
        });

        $('#' + self.SCREEN_ID +' .numpad .input-button').each(function(){
            $(this).off().click(function(){
                var action = $(this).attr('data-action');
                self.do_action(action);
            });
        });

        $('#' + self.SCREEN_ID +' .button.submit').off().on('click',function(){
            self.submit();
        });

        $('#' + self.SCREEN_ID +' .button.resend').off().on('click',function(){
            self.resend_code();
        });
    }

    /**
        Display authentication screen for current user
    **/
    show(allow_change_user){
        var self = this;
        $('.screen').hide();
        $('#' + self.SCREEN_ID).show();

        var back_button = $('#' + self.SCREEN_ID + ' .back');
        if(allow_change_user) $(back_button).show();
        else $(back_button).hide();

        self.print_pin_code();
    }

    set_user(user){
        var self = this;
        self.user = user;

        $('#' + self.SCREEN_ID + ' .user_login').text(user.name);
        $('#' + self.SCREEN_ID + ' .user_image').attr('src',user.image_data);
        self.reset_pin_code();
    }

    reset_pin_code(){
        var self = this;
        self.pin_code = "";
        self.print_pin_code();
    }

    do_action(action){
        var self = this;
        switch(action){
            case '.':
                break;

            case 'BACKSPACE':
                if(self.pin_code != '') self.pin_code = self.pin_code.substring(0, self.pin_code.length-1);
                break;

            default:
                self.pin_code += action;
        }
        console.log(self.pin_code);
        self.print_pin_code();
    }

    print_pin_code(){
        var self = this;
        var obfuscated_pin_code = self.pin_code.replace(/./g, '•');
        $('#' + self.SCREEN_ID + ' .pin_code').text(obfuscated_pin_code);
    }

    submit(){
        var self = this;
        $.ajax({
            type: "POST",
            url: "/streamline/pos/login",
            data: {
                login:      self.user.login,
                pin_code:   self.pin_code
            },
            success: function(data, textStatus, jqXHR){
                if(data.code == 'ERROR'){
                    alert(data.message);
                    self.reset_pin_code();
                }
                else {
                    document.location = data.next_url;
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                 alert("Error: " + errorThrown);
            },
        });
    }

    resend_code(){
        // TODO
    }
}

/**
    Manages the screen where user list is displayed

**/
class UserListScreen {
    constructor(streamline) {
        this.SCREEN_ID = 'user_list_screen';
        this.USER_SELECTION_EVENT = 'user_selection';
        this.streamline = streamline;

        this.selected_user = null;

        var self = this;

        $('.streamline .user_card').each(function(){
            $(this).off().click(function(){
                self.select_user($(this).attr('user_id'));
            });
        });
    }
    /**
        Display user list
    **/
    show(){
        var self = this;
        $('.screen').hide();
        $('#' + self.SCREEN_ID).show();

        self.streamline.allow_changing_user = true;
    }
    /**
        Extract data from user card to build a User
        Trigger USER_SELECTION_EVENT
    **/
    select_user(id){
        var self = this;

        var user_card = $('.user_card[user_id=' + id + ']');

        var user_login = $(user_card).attr('user_login');
        var user_name = $(user_card).attr('user_name');
        var user_image_data = $(user_card.selector + ' img').attr('src');

        self.selected_user = new User(id, user_name, user_login, user_image_data);

        $(self).trigger(self.USER_SELECTION_EVENT);
    }
    get_selected_user(){
        var self = this;
        return self.selected_user;
    }
}

/**
    The User is a structure intended to represent the selected user
    through the whole streamline login process
**/
class User {
    constructor(id, name, login, image_data) {
        this.id = id;
        this.name = name;
        this.login = login;
        this.image_data = image_data;
    }
}

const streamline = new Streamline();