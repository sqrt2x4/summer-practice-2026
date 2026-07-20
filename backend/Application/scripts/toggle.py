from datetime import datetime
from ..database.models import Device, Schedule

WORKDAY_RECURRENCES = ['workdays', 'everyday']
WEEKEND_RECURRENCES = ['weekends', 'everyday']


def _matching_schedules(time_field):
    now = datetime.now()
    current_time_str = now.strftime('%H:%M')
    is_weekend = now.weekday() >= 5  # 5=Saturday, 6=Sunday

    allowed_recurrences = WEEKEND_RECURRENCES if is_weekend else WORKDAY_RECURRENCES

    return Schedule.objects(
        recurrence__in=allowed_recurrences,
        **{time_field: current_time_str}
    )


def power_off_devices():
    schedules = _matching_schedules('powerOffTime')
    for schedule in schedules:
        device = schedule.device
        device.update(midCycle=True)
        continue


def power_on_devices():
    schedules = _matching_schedules('powerOnTime')
    for schedule in schedules:
        device = schedule.device
        device.update(midCycle=False)
        continue