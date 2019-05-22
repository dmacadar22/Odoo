# -*- encoding: utf-8 -*-


{
    "name": "Financial reports levels",
    "summary": """
        Add levels hierarchy to financial reports
    """,
    "version": "1.0",
    'author': '',
    "category": "Accounting",
    'website': '',
    'description': """ """,
    "depends": [
        "account_reports",
    ],
    "demo": [

    ],
    "data": [
        'data/account_financial_report_data.xml',
        'views/inherit_account_view.xml',
    ],
    "installable": True,
    "auto_install": False,
    'application': False,
}
