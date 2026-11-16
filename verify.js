証明書フォーマットに応じて、証明書種別（type）を取得する。

■ 使用情報
- 証明書タイプ：credential.credentialData.type
- VCT：credential.credentialData.vct
- 証明書フォーマット：credential.format

■ 取得ルール

証明書フォーマットが「jwt_vc_json」の場合：
- 証明書タイプ（type）が配列であり、要素数が2以上の場合、配列の末尾の要素を取得する。
- 上記以外の場合、nullを設定する。

証明書フォーマットが「dc+sd-jwt」の場合：
- VCTを「/」で分割し、末尾の要素を取得する。
- 末尾の要素が「BASE_4_INFO_VCT」と一致する場合、証明書種別に「BASE_4_INFO_TYPE」を設定する。
- VCTが存在しない場合、または末尾の要素を取得できない場合、nullを設定する。

上記以外の証明書フォーマットの場合、nullを設定する。
