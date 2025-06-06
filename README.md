# 只针对 Gradle 自身下载走代理：
ENV GRADLE_OPTS="-Dhttp.proxyHost=proxy.co.jp \
                 -Dhttp.proxyPort=18080 \
                 -Dhttps.proxyHost=proxy.co.jp \
                 -Dhttps.proxyPort=18080"
