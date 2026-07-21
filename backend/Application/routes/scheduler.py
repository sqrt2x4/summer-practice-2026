from Application import app
from flask import jsonify, request
from mongoengine import ValidationError
from ..database.models import Device, Schedule
from flask_jwt_extended import jwt_required 

@app.route('/schedule/<device_id>', methods=['GET'])
@jwt_required()
def get_schedule(device_id):
    try:
        device = Device.objects(id=device_id).first()
        if device is None:
            return jsonify({'error': 'Device not found'}), 404

        schedule = Schedule.objects(device=device).first()
        if schedule is None:
            return jsonify(None), 200

        return jsonify({
            '_id': str(schedule.id),
            'device': str(schedule.device.id),
            'startDate': schedule.startDate,
            'endDate': schedule.endDate,
            'powerOnTime': schedule.powerOnTime,
            'powerOffTime': schedule.powerOffTime,
            'recurrence': schedule.recurrence,
            'consumptionPerHour': schedule.consumptionPerHour,  # ADD
        }), 200
    except ValidationError:
        return jsonify({'error': 'Invalid device ID'}), 400
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500


@app.route('/schedule', methods=['POST'])
@jwt_required()
def create_schedule():
    try:
        data = request.get_json()
        device_id = data.pop('device', None)
        if not device_id:
            return jsonify({'error': 'device is required'}), 400

        device = Device.objects(id=device_id).first()
        if device is None:
            return jsonify({'error': 'Device not found'}), 404

        existing = Schedule.objects(device=device).first()
        if existing is not None:
            return jsonify({'error': 'Schedule already exists for this device, use PUT to update'}), 400

        if not data.get('endDate'):  # ADD — treat "" or missing as no end date
            data['endDate'] = None

        schedule = Schedule(device=device, **data)
        schedule.save()

        return jsonify({'message': 'Schedule created successfully'}), 201
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500


@app.route('/schedule/<device_id>', methods=['PUT'])
@jwt_required()
def update_schedule(device_id):
    try:
        device = Device.objects(id=device_id).first()
        if device is None:
            return jsonify({'error': 'Device not found'}), 404

        schedule = Schedule.objects(device=device).first()
        if schedule is None:
            return jsonify({'error': 'No schedule found for this device'}), 404

        data = request.get_json()
        data.pop('device', None)
        data.pop('_id', None)

        if not data.get('endDate'):  # ADD — treat "" or missing as no end date
            data['endDate'] = None

        schedule.update(**data)
        schedule.reload()

        return jsonify({'message': 'Schedule updated successfully'}), 200
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/schedule/<device_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(device_id):
    try:
        device = Device.objects(id=device_id).first()
        if device is None:
            return jsonify({'error': 'Device not found'}), 404

        schedule = Schedule.objects(device=device).first()
        if schedule is None:
            return jsonify({'error': 'No schedule found for this device'}), 404

        schedule.delete()
        return jsonify({'message': 'Schedule removed successfully'}), 200
    except ValidationError:
        return jsonify({'error': 'Invalid device ID'}), 400
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500