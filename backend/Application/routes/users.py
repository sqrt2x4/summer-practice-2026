from Application import app
import configparser
import pymongo # type: ignore
import os
from flask import jsonify # type: ignore
from ..database.models import User
from flask_jwt_extended import jwt_required

# from backend.Application.routes.auth import token_required

secret = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'config.ini')
secret.read(config_path)
client = pymongo.MongoClient(secret['db']['MONGO_URL'])
mydb = client.energysaving


@app.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        users = User.objects().to_json()
        return users, 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500