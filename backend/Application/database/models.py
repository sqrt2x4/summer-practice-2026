from bson.objectid import ObjectId # type: ignore
from mongoengine import * # type: ignore

class User(Document):
    name = StringField(required=True)
    username = StringField(required=True, unique=True)
    password = StringField(required=True)
    role = StringField(required=True, choices=['admin', 'user'])
    site = StringField(required=False)
    group = StringField(required=False)

class Device(Document):
    deviceName = StringField(required=True, unique=True)
    deviceSlNo = StringField(required=False)
    deviceType = StringField(required=False)
    hwType = StringField(required=False)
    group = StringField(required=True)
    site = StringField(required=False)
    owner = StringField(required=False)
    connectivityType = StringField(required=False)
    ip = StringField(required=False)
    port = StringField(required=False)
    loginUser = StringField(required=False)
    password = StringField(required=False)
    readCommunity = StringField(required=False)
    writeCommunity = StringField(required=False)
    powerOnTime = StringField(required=False)  # format: "HH:MM"
    powerOffTime = StringField(required=False)  # format: "HH:MM"
    count = IntField(required=False, default=1)  # câte dispozitive de acest tip
    consumptionPerHour = FloatField(required=False)  # kWh per hour
    midCycle = BooleanField(default=False)  # True while device is powered off mid-schedule
    lastPowerOffAt = DateTimeField(required=False)
    lastPowerOnAt = DateTimeField(required=False)

class DailySaving(EmbeddedDocument):
    subId = ObjectIdField(required=True, default=lambda: ObjectId())
    date = StringField(required=True)  # "2025-07-17"
    hoursOff = FloatField(required=True)  # ore cât a fost oprit
    energySaved = FloatField(required=True)  # kWh economisiti

class Saving(Document):
    deviceName = StringField(required=True, unique=True)
    log = EmbeddedDocumentListField(DailySaving)

class Schedule(Document):
    device = ReferenceField(Device, required=True, unique=True)
    startDate = StringField(required=True)       # "2026-07-14" — matches your mockup's "Start date"
    endDate = StringField(required=False) 
    powerOnTime = StringField(required=True)      # "HH:MM"
    powerOffTime = StringField(required=True)     # "HH:MM"
    recurrence = StringField(required=True, choices=['workdays', 'weekends', 'everyday'])
    consumptionPerHour = FloatField(required=True)  # kWh/hour while device is running


class DailyUsage(EmbeddedDocument):
    subId = ObjectIdField(required=True, default=lambda: ObjectId())
    date = StringField(required=True)        # "YYYY-MM-DD"
    hoursOn = FloatField(required=True)
    energyUsed = FloatField(required=True)    # kWh consumed


class Usage(Document):
    deviceName = StringField(required=True, unique=True)
    log = EmbeddedDocumentListField(DailyUsage)