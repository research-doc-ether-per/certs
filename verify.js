./gradlew clean build -x test -x jvmTest -x jsNodeTest

./gradlew :waltid-libraries:sdjwt:waltid-sdjwt:build -x test -x jvmTest -x jsNodeTest

sudo apt install -y openjdk-21-jdk
java -version

echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
