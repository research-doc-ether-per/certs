-- * VP定義管理テーブル
CREATE TABLE IF NOT EXISTS vp_definitions (
    id VARCHAR(128) NOT NULL,
    group_id VARCHAR(128) NOT NULL DEFAULT 'all',
    name VARCHAR(256) NOT NULL,
    description TEXT DEFAULT NULL,
    credential_types JSONB NOT NULL,
    vc_policies JSONB NOT NULL DEFAULT '[]'::JSONB,
    vp_policies JSONB NOT NULL DEFAULT '[]'::JSONB,
    specific_vc_policies JSONB NOT NULL DEFAULT '[]'::JSONB,
    dcql JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    create_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, id)
);



6	vc_policies	VC標準ポリシー	JSONB		○	[]
7	vp_policies	VP標準ポリシー	JSONB		○	[]
8	specific_vc_policies	VCカスタムポリシー	JSONB		○	[]


単一または複数の証明書を対象としたVP（Verifiable Presentation）の定義情報を管理する。

VP定義情報として、対象証明書タイプ、VC標準ポリシー、VP標準ポリシー、VCカスタムポリシー、DCQLおよび公開設定を保持する。

グループIDにより、全グループ共通のVP定義情報とグループ固有のVP定義情報を管理する。
