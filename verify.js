認証処理を実施する。

—————————————————

リクエストパラメータから情報を取得する。

・groupId：グループID

—————————————————

ユーザ種別に応じて公開条件を設定する。

【個人ユーザ・組織ユーザの場合】
・is_public：true

【管理者の場合】
・公開条件を指定しない。

—————————————————

VP定義管理テーブル（vp_definitions）からVP定義情報を取得する。

■検索条件
・group_id：リクエストパラメータで指定されたgroupId（未指定または空文字の場合は「all」）
・is_public：ユーザ種別に応じて設定した公開条件

—————————————————

指定されたグループIDが「all」以外で、VP定義情報が取得できなかった場合、VP定義管理テーブル（vp_definitions）から共通のVP定義情報を取得する。

■検索条件
・group_id：all
・is_public：ユーザ種別に応じて設定した公開条件

—————————————————

取得したVP定義情報をソートする。

■ソート条件
・id：昇順

—————————————————

取得したVP定義情報ごとに、Policy情報（policies）を整理する。

・vc_policies：VC標準Policy
・vp_policies：VP標準Policy
・specific_vc_policies：VC個別Policy

※specific_vc_policiesが存在し、空でない場合のみ追加する。

—————————————————

VP定義情報（vpDefinitions）を整理する。

・dcqlQuery：取得したDCQL定義情報
・policies：整理したPolicy情報

—————————————————

レスポンス情報を整理し、返却する。

※VP定義情報が取得できなかった場合は、空の配列を返却する。

※処理中に上記記載以外のエラーが発生した場合、InternalServerErrorを返却する。
