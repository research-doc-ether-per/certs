account_idには、walt.idのAccount IDを設定する。
waltid_walletには、walt.idのWallet IDを設定する。
将来的な1 Account対複数Walletの構成に対応するため、Walletの関連情報はaccount_walletsテーブルで管理する。

アカウント・ウォレット関連テーブル
account_wallets
walt.idのAccountとWalletの関連情報を管理する。
1つのAccountに複数のWalletを関連付けることができる。
移行時には、walt.idの`account_wallet_mapping`および`wallets`から取得した情報を登録する。

カラム情報：
物理名	論理名	データ型	Primary	Not Null
account_id	アカウントID	varchar(128)	Yes	Yes
wallet_id	ウォレットID	varchar(128)	Yes	Yes
wallet_name	ウォレット名	varchar(128)		
added_on	登録日時	timestamp		


DIDエイリアス情報テーブル
did_aliases
Walletに紐づくDIDのエイリアス情報を管理する。
1つのWalletに複数のDIDを登録できる。
移行時には、walt.idのwallet_didsから取得したDIDおよびエイリアス情報を登録する。

物理名	論理名	データ型	Primary	Not Null
wallet_id	ウォレットID	varchar(128)	Yes	Yes
did	DID	varchar(1024)	Yes	Yes
alias	エイリアス	varchar(1024)		Yes
created_on	作成日時	timestamp
