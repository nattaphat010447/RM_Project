FROM python:3.10-slim

WORKDIR /app

# build-essential is needed to compile some Python packages (e.g. psycopg2
# from source, if ever swapped in for psycopg2-binary). This project uses
# PostgreSQL exclusively - no MySQL client library is required.
RUN apt-get update \
    && apt-get install -y pkg-config build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

# Install PyTorch and ML dependencies for training scripts
RUN pip install --no-cache-dir torch==2.0.1 pandas scikit-learn

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]