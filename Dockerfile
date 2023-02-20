# pull the official base image
FROM python:3.8-slim

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# set container working directory
WORKDIR /app

# copy requirements file first to working directory (helps cache layer)
COPY requirements.txt ./

# create a virtual environment in /opt
RUN python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

# install dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# copy project to working directory
COPY . ./

EXPOSE 8000

# create custom non-root user and group
RUN adduser --disabled-password --no-create-home app
# change project owner and group to the one created
RUN chown -R app:app ./

USER app

# change file mode for directory contents to executable
RUN chmod -R +x ./scripts

CMD ["./scripts/run.sh"]
