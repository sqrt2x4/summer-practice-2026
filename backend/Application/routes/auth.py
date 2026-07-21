import configparser
import os

from Application import app
from flask import jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt

from Application.database.models import User
from Application.scripts.utils import insert_user

secret = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'config.ini')
secret.read(config_path)

app.config['JWT_SECRET_KEY'] = secret['db']['SECRET_KEY']
jwt_manager = JWTManager(app)  # renamed — no longer shadows anything


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.objects(username=username).first()
    if user and bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        access_token = create_access_token(identity=str(username))
        return {
            'access_token': access_token,
            'message': 'Login Successful',
            'loggedinUser': username,
            'name': user.name or username,
            'role': user.role,
            'group': user.group,
        }
    else:
        return {'message': 'Invalid credentials'}, 401


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    site = data.get('site')
    group = data.get('group')
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    user = {
        "name": name or username,
        "username": username,
        "password": hashed_password,
        "role": role,
        "site": site,
        "group": group,
    }
    action = insert_user(user)
    if 'error' not in action:
        return {"message": "User successfully added"}
    return action


@app.route('/me', methods=['GET'])
@jwt_required()
def me():
    username = get_jwt_identity()
    user = User.objects(username=username).first()
    if user is None:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'username': user.username,
        'name': user.name,
        'role': user.role,
        'group': user.group,
    }), 200