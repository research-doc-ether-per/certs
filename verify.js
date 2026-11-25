


単一または複数の証明書を対象としたVP（Verifiable Presentation）の定義情報を管理する。

VP定義情報として、対象証明書タイプ、標準ポリシー、カスタムポリシー、DCQLおよび公開設定を保持する。

グループIDにより、全グループ共通のVP定義情報とグループ固有のVP定義情報を管理する。



No.	物理名	論理名	データ型	PK	NOT NULL	デフォルト値
1	id	VP定義ID	VARCHAR(128)	○	○	—
2	group_id	グループID	VARCHAR(128)	○	○	'all'
3	name	VP定義名	VARCHAR(256)		○	—
4	description	説明	TEXT			NULL
5	credential_types	対象証明書タイプ	JSONB		○	—
6	standard_policies	標準ポリシー	JSONB		○	[]
7	custom_policies	カスタムポリシー	JSONB		○	[]
8	dcql	DCQL定義	JSONB		○	—
9	is_public	公開フラグ	BOOLEAN		○	FALSE
10	create_date	作成日時	TIMESTAMP WITH TIME ZONE			CURRENT_TIMESTAMP
11	update_date	更新日時	TIMESTAMP WITH TIME ZONE			CURRENT_TIMESTAMP


-- * VP定義管理テーブル
CREATE TABLE IF NOT EXISTS vp_definitions (
    id VARCHAR(128) NOT NULL,
    group_id VARCHAR(128) NOT NULL DEFAULT 'all',
    name VARCHAR(256) NOT NULL,
    description TEXT DEFAULT NULL,
    credential_types JSONB NOT NULL,
    standard_policies JSONB NOT NULL DEFAULT '[]'::JSONB,
    custom_policies JSONB NOT NULL DEFAULT '[]'::JSONB,
    dcql JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    create_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, id)
);

