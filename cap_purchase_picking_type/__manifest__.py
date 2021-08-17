
{
    'name': 'CAP Purchase Picking Type',
    'author': 'NathanQj',
    'version': '12.0',
    'depends': ['base','purchase'],
    'description': """    
    Restricts Purchase Picking Types based on the ones authorized on the Users 
    """,
    "qweb": [],
    'data': [
             'views/users.xml',
             'views/purchase_order.xml',
             ],
    'installable': True
}
