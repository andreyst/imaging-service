FROM ubuntu:bionic

RUN apt-get update && apt-get install -y \
      nano \
      less \
      netcat \
      net-tools \
      rsyslog \
      lsof \
      sudo \
      telnet \
      ruby-full \
      build-essential \
      libsqlite3-dev \
    && gem install mailcatcher
