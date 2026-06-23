
const axios = require('axios');

// walt.id Issuer サービスのベースURL
// 環境に合わせて適宜変更してください
const BASE_URL = 'https://issuer.demo.walt.id';

/**
 * 1. mDL用の IACA (Issuing Authority Certification Authority) 証明書を発行します
 * @param {Object} payload - リクエストボディデータ
 * @returns {Promise<Object>} APIからのレスポンスデータ
 */
async function onboardIaca(payload) {
    try {
        console.log('--- onboardIaca メソッドの実行開始 ---');
        
        const url = `${BASE_URL}/onboard/iso-mdl/iacas`;
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('IACA 証明書の作成処理が正常に完了しました');
        return response.data;
    } catch (error) {
        console.error('onboardIaca メソッドでエラーが発生しました');
        handleError(error);
        throw error;
    }
}

/**
 * 2. mDL用の DS (Document Signer) 証明書を発行します
 * @param {Object} payload - リクエストボディデータ
 * @returns {Promise<Object>} APIからのレスポンスデータ
 */
async function onboardDocumentSigner(payload) {
    try {
        console.log('--- onboardDocumentSigner メソッドの実行開始 ---');
        
        const url = `${BASE_URL}/onboard/iso-mdl/document-signers`;
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('Document Signer 証明書の作成処理が正常に完了しました');
        return response.data;
    } catch (error) {
        console.error('onboardDocumentSigner メソッドでエラーが発生しました');
        handleError(error);
        throw error;
    }
}

/**
 * 3. 新しい Issuer をシステムにオンボーディング（登録）します
 * @param {Object} payload - リクエストボディデータ
 * @returns {Promise<Object>} APIからのレスポンスデータ
 */
async function onboardIssuer(payload) {
    try {
        console.log('--- onboardIssuer メソッドの実行開始 ---');
        
        const url = `${BASE_URL}/onboard/issuer`;
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('Issuer のオンボーディング処理が正常に完了しました');
        return response.data;
    } catch (error) {
        console.error('onboardIssuer メソッドでエラーが発生しました');
        handleError(error);
        throw error;
    }
}

/**
 * エラーハンドリング用の共通メソッド
 * @param {Error} error - 発生したエラーオブジェクト
 */
function handleError(error) {
    if (error.response) {
        console.error(`ステータスコード: ${error.response.status}`);
        console.error('エラーレスポンス詳細:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error(`メッセージ: ${error.message}`);
    }
}

// ==========================================
// メソッドの実行例（メインフロー）
// ==========================================
async function main() {
    try {
        console.log('オンボーディングプロセスを開始します');

        // 1. IACAオンボーディングの実行
        const iacaParams = {
            keyGenerationRequest: {
                keyType: "Ed25519"
            },
            onboardRequestDid: {
                didMethod: "jwk"
            }
        };
        const iacaResult = await onboardIaca(iacaParams);
        console.log('IACA 応答データ:', JSON.stringify(iacaResult, null, 2));


        // 2. Document Signer オンボーディングの実行
        const dsParams = {
            keyGenerationRequest: {
                keyType: "Ed25519"
            }
        };
        const dsResult = await onboardDocumentSigner(dsParams);
        console.log('Document Signer 応答データ:', JSON.stringify(dsResult, null, 2));


        // 3. Issuerオンボーディングの実行
        const issuerParams = {
            didMethod: "jwk",
            keyType: "Ed25519"
        };
        const issuerResult = await onboardIssuer(issuerParams);
        console.log('Issuer 応答データ:', JSON.stringify(issuerResult, null, 2));

        console.log('すべてのオンボーディングプロセスが正常に終了しました');
    } catch (error) {
        console.error('メイン処理中にエラーが検知されたため、フローを中断しました');
    }
}

// 実行
main();
