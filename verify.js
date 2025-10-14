# ステータスリストタイプ一覧

| 名称 | 系統 / 提案元 | 主な用途・特徴 | データ形式 | W3C / IETF 公式リンク |
|------|----------------|----------------|--------------|------------------------|
| **RevocationList2020** | W3C CCG（初期提案） | 最初期のステータスリスト。VCの失効（revocation）のみ管理。ビット列＋GZIP＋Base64URL構造を採用。 | JSON-LD | [https://w3c-ccg.github.io/vc-status-rl-2020/](https://w3c-ccg.github.io/vc-status-rl-2020/) |
| **StatusList2021** | W3C（後継仕様） | RevocationList2020 の拡張版。撤回だけでなく一時停止なども扱える汎用ステータス。 | JSON-LD | [https://www.w3.org/TR/vc-status-list-20230427/](https://www.w3.org/TR/vc-status-list-20230427/) |
| **BitstringStatusList** | W3C（VC v2対応） | StatusList2021 の最新版名称。構造は同じだが「ビット列方式」であることを明示。walt.id v0.15.1 で標準採用。 | JSON-LD / JWT-VC | [https://www.w3.org/TR/vc-bitstring-status-list/](https://www.w3.org/TR/vc-bitstring-status-list/) |
| **TokenStatusList** | IETF / OAuth / SD-JWT | IETF系のステータスリスト。JWT（またはCWT）形式でトークンの状態を管理。W3Cルートとは別系統。 | JWT / CWT | [https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/](https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/) |
