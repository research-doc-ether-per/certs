// Credential Offer作成成功後、証明書情報を更新する。
await walletDBService._update(
    client,
    'add_cert',
    {
        vc_info: JSON.stringify(payload)
    },
    {
        doc_id: addCert.docId
    }
)
