## Features

* **User Authentication:** Secure Registration and Login using JSON Web Tokens (JWT).
* **Role-Based Access Control:** Differentiates between regular Customers and Admins.
* **Manga Catalog:** Browse mangas by title, author, and genre with detailed views.
* **Inventory Management:** Tracks individual manga copies (Available, Rented, Lost, Damaged).
* **Shopping Cart System:** Users can add available manga copies to their cart and set rental durations.
* **Rental Order Processing:** Checkout system with automatic rent fee calculations and return tracking.
* **Dockerized Environment:** Easy setup and deployment using Docker Compose.
* **Manga Rating & Reviews:** Users can rate mangas (1-5 stars) after returning them, automatically updating the manga's average rating.
* **Automated Background Tasks:** Integrated APScheduler to automatically scan and mark overdue rentals (90+ days) as 'LOST' every 00:00 AM.
* **Advanced Admin Dashboard:** Comprehensive history tracking, real-time search filtering, and member management.
* **User Profile Management:** Users can update their personal information, delivery address, and password securely.

## Tech Stack

* **Frontend:** React.js (Vite), Tailwind CSS
* **Backend:** Python, Django, Django REST Framework (DRF)
* **Database:** MySQL 8.0
* **Authentication:** JSON Web Tokens (SimpleJWT)
* **Infrastructure:** Docker, Docker Compose

## Prerequisites

To run this project, you only need to have the following installed on your machine:

* [Docker](https://www.docker.com/products/docker-desktop/)
* [Docker Compose](https://docs.docker.com/compose/install/)

## Environment Variables

Create a `.env` file in the **root directory** of the project and add the following configuration:

```env
# MySQL
MYSQL_ROOT_PASSWORD=rootpassword_secret
MYSQL_DATABASE=manga_rental_db
MYSQL_USER=manga_user
MYSQL_PASSWORD=manga_password_secret
MYSQL_HOST=db_mysql
MYSQL_PORT=3306

# MongoDB
MONGO_ROOT_USERNAME=mongoadmin
MONGO_ROOT_PASSWORD=mongosecret_password

# Django
SECRET_KEY=your_django_super_secret_key
DEBUG=True

# Backend API URL
VITE_API_BASE_URL=http://localhost:8000
```

## Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/nattaphat010447/RM_Project.git
cd RM_Project

```


2. **Build and start the containers:**
```bash
docker-compose up -d --build

```



## Database Setup & Seeding

Once the containers are running, set up the database schema and insert initial data:

1. **Run Migrations:**
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

```


2. **Insert sample mangas:**
```bash
docker-compose exec backend python seed.py

```


3. **Create an Admin User:**
```bash
docker-compose exec backend python manage.py createsuperuser

```



## Running the Application

After successful setup, you can access the application in your browser:

* **Frontend (React UI):** [http://localhost:3000](http://localhost:3000)
* **Backend API (Django):** [http://localhost:8000/api/](http://localhost:8000/api/)
* **Django Admin Panel:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

To stop the application, run:

```bash
docker-compose down

```
