-- ウォレットエイリアステーブルの作成日時をタイムゾーン付きに変更し、デフォルト値を設定
ALTER TABLE wallet_aliases
ALTER COLUMN created_on TYPE TIMESTAMP WITH TIME ZONE,
ALTER COLUMN created_on SET DEFAULT CURRENT_TIMESTAMP;

-- DIDエイリアステーブルの作成日時をタイムゾーン付きに変更し、デフォルト値を設定
ALTER TABLE did_aliases
ALTER COLUMN created_on TYPE TIMESTAMP WITH TIME ZONE,
ALTER COLUMN created_on SET DEFAULT CURRENT_TIMESTAMP;
