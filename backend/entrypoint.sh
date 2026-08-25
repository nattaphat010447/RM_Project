#!/bin/sh
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding example_user01..."
python manage.py seed_example_user

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000
