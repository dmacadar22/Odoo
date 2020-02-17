def migrate(cr, version):
    """ Remove studio customization for this field that has been developed from python side """

    cr.execute("""
                    delete from ir_model_fields where name = 'x_studio_total_weight' and model='pos.order.line'
                """)
