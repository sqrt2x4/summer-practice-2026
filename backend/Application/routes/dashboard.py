from Application import app
from flask import jsonify
from datetime import datetime, timedelta
from ..database.models import Device, Saving, Usage
from flask_jwt_extended import jwt_required

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@app.route('/dashboard/summary', methods=['GET'])
@jwt_required()
def dashboard_summary():
    try:
        registered_devices = Device.objects.count()

        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())  # Monday of this week

        daily_totals = {
            (week_start + timedelta(days=i)).strftime('%Y-%m-%d'): {"usage": 0.0, "saved": 0.0}
            for i in range(7)
        }

        for saving in Saving.objects():
            for entry in saving.log:
                if entry.date in daily_totals:
                    daily_totals[entry.date]["saved"] += entry.energySaved

        for usage in Usage.objects():
            for entry in usage.log:
                if entry.date in daily_totals:
                    daily_totals[entry.date]["usage"] += entry.energyUsed

        total_power_consumption = 0.0
        total_energy_saved = 0.0

        weekly_power_usage = []
        for i in range(7):
            date_key = (week_start + timedelta(days=i)).strftime('%Y-%m-%d')
            day_data = daily_totals[date_key]
            weekly_power_usage.append({
                "day": DAY_LABELS[i],
                "usage": round(day_data["usage"], 2),
                "saved": round(day_data["saved"], 2),
            })
            total_power_consumption += day_data["usage"]
            total_energy_saved += day_data["saved"]

        return jsonify({
            "registeredDevices": registered_devices,
            "totalPowerConsumption": round(total_power_consumption, 2),
            "energySaved": round(total_energy_saved, 2),
            "weeklyPowerUsage": weekly_power_usage,
        }), 200
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500