
sudo apt install -y \
  curl \
  wget \
  git \
  unzip \
  zip \
  build-essential \
  net-tools \
  ca-certificates \
  gnupg \
  lsb-release \
  openssh-server


sudo systemctl enable ssh
sudo systemctl start ssh
