from odoo import fields, models, _, api
from odoo.exceptions import AccessDenied


class ResUsers(models.Model):
    """ Used to allow a user to be redirected to a POS session (opened or default) """
    _inherit = 'res.users'

    is_pos_redirected = fields.Boolean(string='Automatically start POS session',
                                       help='Redirect to the opened session or to the default session if defined',
                                       store=True)
    default_pos_config = fields.Many2one(string='Default Point Of Sale',
                                         help='The default POS config to use when starting a new session',
                                         comodel_name='pos.config',
                                         store=True)

    @api.model
    def open_pos_session(self):
        """
            Try to start a POS session for this user

            :return True if a session started for this user
                    False otherwise
        """
        session_started = False

        if self.is_pos_redirected:
            # Is there already a open session for this user ?
            user_search_domain = [('user_id', '=', self.id), ('state', 'in', ('opened', 'opening_control'))]
            open_session = self.env['pos.session'].search(user_search_domain, limit=1)

            # There is no open session
            # Open a session using the default config (if defined)
            if (not open_session) and self.default_pos_config:
                open_session = self.default_pos_config.open_session_cb()

                if self.default_pos_config.cash_control:
                    open_session.write({'opening_balance': True})

            elif open_session.state == 'opening_control':
                open_session.action_pos_session_open()

            if open_session:
                session_started = True

        return session_started

    def authenticate_by_security_pin(self, db, login, security_pin):
        return self.authenticate(db, login, security_pin)

    # A REMPLACER PAR UNE RECHERCHE SUR LE SECURITY PIN
    def _check_credentials(self, password):
        """ Validates the current user's password.
        Override this method to plug additional authentication methods
        """
        assert password
        if self.is_pos_redirected:
            if self.pos_security_pin == password:
                return
            else:
                raise AccessDenied()
        else:
            super(ResUsers, self)._check_credentials(password)
