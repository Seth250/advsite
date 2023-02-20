#!/bin/sh

# stops the execution if a command during the execution has an error
set -e

python manage.py migrate --noinput

python manage.py runserver 0.0.0.0:8000
