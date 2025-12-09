Gradle がビルド中に必要な Java 17 の JDK を見つけられず、
自動で外部サイトから JDK をダウンロードしようとしました。

しかし、そのサイトが 502 Bad Gateway（アクセス不可） だったため、
ビルドが失敗しました。


Dockerfile に Java 17（openjdk-17-jdk）を手動でインストールし、
Gradle が外部に依存せずローカルの JDK を使えるようにしました。
