FROM node:14-bullseye
MAINTAINER Retric Su <retric@cryptape.com>

COPY . /godwoken-polyman/.
RUN cd /godwoken-polyman && yarn && yarn build:server

RUN apt-get update \
 && apt-get dist-upgrade -y \
 && apt-get install curl -y \
 && apt-get install jq -y \
 && apt-get clean \
 && echo "Finished installing dependencies"

EXPOSE 3000 6100 6101 6102
