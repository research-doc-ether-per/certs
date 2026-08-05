証明書取得時に使用可能な認可方式一覧

・pre_authorized：事前認可コードフロー
・pwd：認可コードフロー

設定値が all の場合、authTypes には pre_authorized および pwd が指定される。
設定値が pre_authorized の場合、authTypes には pre_authorized のみが指定される。
設定値が pwd の場合、authTypes には pwd のみが指定される。
該当する認可方式が存在しない場合、authTypes には空配列が指定される。


取得したフィールド定義、認可方式および証明書画像データを返却値として設定する。
認可方式は配列形式で返却し、all の場合は pre_authorized および pwd、pre_authorized の場合は pre_authorized、pwd の場合は pwd を設定する。
認可方式が取得できない場合は空配列を設定する。
