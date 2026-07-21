from datetime import datetime
from ..database.models import Device, Schedule, Saving, DailySaving, Usage, DailyUsage

WORKDAY_RECURRENCES = ['workdays', 'everyday']
WEEKEND_RECURRENCES = ['weekends', 'everyday']


def _matching_schedules(time_field):
    now = datetime.now()
    current_time_str = now.strftime('%H:%M')
    current_date_str = now.strftime('%Y-%m-%d')
    is_weekend = now.weekday() >= 5

    allowed_recurrences = WEEKEND_RECURRENCES if is_weekend else WORKDAY_RECURRENCES

    candidates = Schedule.objects(
        recurrence__in=allowed_recurrences,
        **{time_field: current_time_str}
    )

    active = [
        s for s in candidates
        if not s.endDate or s.endDate >= current_date_str
    ]
    return active


def power_off_devices():
    schedules = _matching_schedules('powerOffTime')
    for schedule in schedules:
        device = schedule.device
        _record_usage(device, schedule.consumptionPerHour)
        device.update(midCycle=True, lastPowerOffAt=datetime.now(), unset__lastPowerOnAt=1)
        continue


def power_on_devices():
    schedules = _matching_schedules('powerOnTime')
    for schedule in schedules:
        device = schedule.device
        _record_saving(device, schedule.consumptionPerHour)
        device.update(midCycle=False, unset__lastPowerOffAt=1, lastPowerOnAt=datetime.now())
        continue


def _record_saving(device, consumption_per_hour):
    if not device.lastPowerOffAt:
        return

    now = datetime.now()
    seconds_off = (now - device.lastPowerOffAt).total_seconds()
    if seconds_off <= 0:
        return

    hours_off = seconds_off / 3600
    count = device.count or 1
    energy_saved = hours_off * (consumption_per_hour or 0) * count

    entry = DailySaving(
        date=now.strftime('%Y-%m-%d'),
        hoursOff=round(hours_off, 4),
        energySaved=round(energy_saved, 4),
    )

    saving = Saving.objects(deviceName=device.deviceName).first()
    if saving is None:
        saving = Saving(deviceName=device.deviceName, log=[entry])
        saving.save()
    else:
        saving.update(push__log=entry)


def _record_usage(device, consumption_per_hour):
    if not device.lastPowerOnAt:
        return  # device was never marked on — nothing to record (e.g. very first cycle)

    now = datetime.now()
    seconds_on = (now - device.lastPowerOnAt).total_seconds()
    if seconds_on <= 0:
        return

    hours_on = seconds_on / 3600
    count = device.count or 1
    energy_used = hours_on * (consumption_per_hour or 0) * count

    entry = DailyUsage(
        date=now.strftime('%Y-%m-%d'),
        hoursOn=round(hours_on, 4),
        energyUsed=round(energy_used, 4),
    )

    usage = Usage.objects(deviceName=device.deviceName).first()
    if usage is None:
        usage = Usage(deviceName=device.deviceName, log=[entry])
        usage.save()
    else:
        usage.update(push__log=entry)