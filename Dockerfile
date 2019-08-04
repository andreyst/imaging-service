FROM ubuntu:bionic

ADD docker/setup_node_10.x /tmp/setup_node_10.x

RUN /tmp/setup_node_10.x \
    && apt-get install -y \
      nano \
      nodejs \
      less \
      netcat \
      net-tools \
      rsyslog \
      lsof \
      sudo \
      telnet \
    && npm install -g nodemon

ADD src /opt/shop-services/src
ADD google_cloud_key.json /opt/shop-services/google_cloud_key.json