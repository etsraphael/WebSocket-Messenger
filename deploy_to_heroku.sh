#!/bin/sh

if [ ! -x "$(command -v docker)" ]
then
    echo "Veuillez installer docker"
    exit 1
fi

if [ ! -x "$(command -v heroku)" ]
then
    echo "Veuillez installer heroku"
    exit 1
fi

heroku container:login && \
heroku container:push web && \
heroku container:release web