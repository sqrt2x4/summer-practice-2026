from Application import app
from mongoengine import ValidationError # type: ignore
from flask import jsonify, request # type: ignore
from ..database.models import Device


@app.route('/devices', methods=['GET'])
def get_devices():
    try:
        devices = Device.objects().to_json()
        return devices, 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/device', methods=['POST'])
def add_device():
    try:
        device_data = request.get_json()
        new_device = Device(**device_data)
        new_device.save()
        return jsonify({'message': 'Device added successfully'}), 201
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 400

@app.route('/device/<device_id>', methods=['PUT'])
def update_device(device_id):
    try:
        device = Device.objects(id=device_id).first()
        if device is None:
            return jsonify({'error': 'Device not found'}), 404

        device_data = request.get_json()
        device_data.pop('_id', None)  # never allow _id to be reassigned
        device.update(**device_data)
        device.reload()

        return jsonify({'message': 'Device updated successfully'}), 200
    except ValidationError:
        return jsonify({'error': 'Invalid device ID'}), 400
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 400

@app.route('/device/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    try:
        device = Device.objects(id=device_id).first()
        if device is None:
            return jsonify({'error': 'Device not found'}), 404

        device.delete()
        return jsonify({'message': 'Device deleted successfully'}), 200
    except ValidationError:
        return jsonify({'error': 'Invalid device ID'}), 400
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500