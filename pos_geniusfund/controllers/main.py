import json

from werkzeug.wrappers import Response

from addons.point_of_sale.controllers.main import PosController
from odoo import http
from odoo.http import request


class StreamlinePosController(http.Controller):

    # @http.route('/web/login', type='http', auth="none", sitemap=False)
    # def web_login(self, redirect=None, **kw):
    #     response = super(Home, self).web_login(redirect, **kw)
    #
    #     if request.params['login_success']:
    #         uid = request.session.authenticate(request.session.db, request.params['login'], request.params['password'])
    #         user = request.env['res.users'].browse([uid])
    #
    #         is_session_opened = user.open_pos_session()
    #
    #         if is_session_opened:
    #             return http.redirect_with_hash('/pos/web')
    #
    #     return response

    @http.route('/streamline/pos/start', type='http', auth="none", sitemap=False)
    def web_start_screen(self, team_id, redirect=None, **kw):
        """
            Render a page containing a list of budtenders for the given store

        :param team_id: The store id
        :param redirect:

        :return: A screen to streamline the budtender login process
        """

        user_search_domain = [('active', '=', True), ('company_id.id', '=', team_id), ('is_pos_redirected', '=', True)]
        # ('is_pos_redirected', '=', True)
        users_id = request.env['res.users'].sudo().search(user_search_domain)

        context = {
            'state': 'start',
            'users_id': users_id,
        }
        return request.render('pos_geniusfund.streamline_screens', qcontext=context)

    @http.route('/streamline/pos/authentication', type='http', auth="none", sitemap=False)
    def web_authentication_screen(self, user_id, redirect=None, **kw):
        """
            Render a page for the budtender to authenticate

        :param user_id: The user id
        :param redirect:

        :return: A screen to authenticate given user
        """

        users_id = request.env['res.users'].sudo().browse(int(user_id))

        context = {
            'state': 'authentication',
            'users_id': [users_id],
        }
        return request.render('pos_geniusfund.streamline_screens', qcontext=context)

    @http.route('/streamline/pos/login', type='http', auth="none", sitemap=False, csrf=False)
    def web_login(self, login, pin_code, **kw):
        """
            Try to log given user
            If user is authenticated with success, try one of this :
                1 - Redirect him to his opened POS Session (if one exists)
                2 - Open a default POS Session (if defined) and redirect him to that session
                3 - Redirect him to POS module
            Else returns a json response

            :param login    : the user's login
            :param pin_code : the user's pos_security_pin

            :return json response containing
                        code    : SUCCESS / ERROR
                        next_url: Next page to display if authenticated
                        message : Detailed message

        """
        response_dict = {
            'code': 'ERROR',
            'next_url': '',
            'message': '',
        }

        # Try authenticating a user with pos_security_pin
        try:
            uid = request.session.authenticate(request.session.db, login, pin_code)
            if uid:
                user = request.env['res.users'].browse([uid])
                is_session_opened = user.open_pos_session()
                if is_session_opened:
                    response_dict['code'] = 'SUCCESS'
                    response_dict['next_url'] = '/pos/web'

                    # response_dict['html'] = PosController.pos_web(self)
                    # return http.redirect_with_hash('/pos/web')
                    # return set_cookie_and_redirect('/pos/web')
                else:
                    # TODO go to POS module
                    pass
            else:
                # User is not authenticated.
                response_dict['message'] = 'Authentication failed.'

        except Exception as e:
            # TODO Return a page with authentication failure
            response_dict['message'] = str(e)

        return Response(json.dumps(response_dict), content_type='application/json', status=200)
