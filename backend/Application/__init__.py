
from flask import Flask
from .database.db import initialize_db
from flask_cors import CORS
import configparser
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import time

secret = configparser.ConfigParser()
secret.read('Application/scripts/config.ini') 


app = Flask("__name__", static_folder='Application/static')
app.config['MONGODB_SETTINGS'] = {
    'host': secret['db']['MONGO_URL']
}
initialize_db(app)
CORS(app)

def print_date_time():
    print(time.strftime("%A, %d. %B %Y %I:%M:%S %p"))


sched = BackgroundScheduler(daemon=True)
sched.add_job(print_date_time,'interval',hours=1)
sched.start()

from .routes.users import app
from .routes.auth import app
from .routes.device import app



  








