if [ ! -x "$(command -v docker)" ]
then
    echo "Veuillez installer docker"
    exit 1
fi

docker build -t piins_chat_server . && \
docker run --rm -d -p 8181:8181 --name piins_chat_server piins_chat_server