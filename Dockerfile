FROM ubuntu:bionic

ADD docker/setup_node_10.x /tmp/setup_node_10.x

RUN /tmp/setup_node_10.x \
    && apt-get install -y \
      nodejs \
      less \
    && npm install -g nodemon

ADD services /opt/imaging-service/services/