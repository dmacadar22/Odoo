def migrate(cr, version):
    """ Change URL from specific to generic (no need to include web.base.url) """

    cr.execute("""update ir_act_url 
                    set url = '/web/customer_display#action=customer_display.ui' 
                    where id = '1001'
                    and name = 'Customer Display'
                """)
