# docker/.hadolint.yaml

# エラーが1つでもあれば失敗
failure-threshold: error

# 出力形式（ローカル実行向け）
format: tty

# 全体無視ルール
# ※ 必要になった場合のみ追加する
ignored: []

override:
  error:
    # latest タグ禁止
    - DL3007

    # ベースイメージは明示的なタグ必須
    - DL3006

  warning:
    # apt で --no-install-recommends 推奨
    - DL3015

    # apk でバージョン固定推奨
    - DL3018

    # apt-get install のバージョン固定推奨
    - DL3008

    # pip キャッシュ使用回避（Python 用）
    - DL3042

    # RUN の連続定義（可読性優先のため warning）
    - DL3059

# 信頼するレジストリ
trustedRegistries:
  - docker.io
  - ghcr.io
