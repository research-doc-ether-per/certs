import { logger } from './logger';
import { verificationService } from './verificationService';

/**
 * 証明書リストをループし、各証明書を1件ずつ検証する
 * * @returns {Promise<Array<Object>>} セッション情報の配列
 */
const runIndividualVerification = async () => {
  logger.info('*** 個別検証ループの開始 ***');

  const credentialConfigs = [
    {
      id: 'awards_verification',
      format: 'dc+sd-jwt',
      typeField: 'vct_values',
      typeValue: 'Awards' 
    },
    {
      id: 'career_verification',
      format: 'jwt_vc_json',
      typeField: 'type_values',
      typeValue: [['Career']]
    },
    {
      id: 'qualifications_verification',
      format: 'jwt_vc_json',
      typeField: 'type_values',
      typeValue: [['Qualifications']]
    }
  ];

  const sessionResults = [];

  for (const config of credentialConfigs) {
    try {
      logger.info(`検証セッションを生成中: ${config.id}`);

      const requestParams = {
        flow_type: 'cross_device',
        core_flow: {
          dcql_query: {
            credentials: [
              {
                id: config.id,
                format: config.format,
                meta: {
                  [config.typeField]: config.typeValue
                }
              }
            ]
          },
          policies: {
            vp_policies: [
              { policy: 'signature' },
              { policy: 'expiration' }
            ]
          }
        }
      };

      const sessionData = await verificationService.createVerificationSession(requestParams);
      
      logger.info(`セッション作成成功: ${config.id}. セッションID: ${sessionData.sessionId}`);
      
      sessionResults.push({
        credentialId: config.id,
        sessionId: sessionData.sessionId,
        // 軽量なPresentationRequestURL
        // ウォレットは、このURLを読み取った後、当該URLに基づいて詳細な検証条件（DCQLなど）を取得
        presentationUrl: sessionData.bootstrapAuthorizationRequestUrl 
      });

    } catch (error) {
      logger.error(`セッション作成失敗 ${config.id}: `, error.message);
    }
  }

  logger.info('*** 個別検証ループの終了 ***');
  return sessionResults;
};






/**
 * 複数証明書の組み合わせ検証
 * 異なる format かつ異なる種類の証明書を組み合わせた検証を行う
 * * @returns {Promise<Object>} セッション初期化結果
 */
const runCombinedVerification = async () => {
  logger.info('*** 組み合わせ検証の開始 ***');

  const combinedRequestParams = {
    flow_type: 'cross_device',
    core_flow: {
      dcql_query: {
        credentials: [
          {
            id: 'combined_career_req',
            format: 'jwt_vc_json',
            meta: {
              type_values: [["Career"]]
            }
          },
          {
            id: 'combined_awards_req',
            format: 'dc+sd-jwt',
            meta: {
              vct_values: ['Awards']
            }
          }
        ]
      },
      policies: {
        vp_policies: [
          { policy: 'signature' },
          { policy: 'expiration' },
          { policy: 'not-before' }
        ]
      }
    }
  };

  try {
    const sessionData = await verificationService.createVerificationSession(combinedRequestParams);
    
    logger.info('組み合わせ検証セッションの作成に成功しました。');
    logger.info(`セッションID: ${sessionData.sessionId}`);
    
    return {
      success: true,
      sessionId: sessionData.sessionId,
      // 軽量なPresentationRequestURL
      // ウォレットは、このURLを読み取った後、当該URLに基づいて詳細な検証条件（DCQLなど）を取得
      presentationUrl: sessionData.bootstrapAuthorizationRequestUrl,
     // すべての検証条件（DCQL等）を内包したPresentationRequestURL
      // このURLには詳細な検証条件（DCQLなど）が含まれているため、Verifierへ再問い合わせを行う必要はありません。（同一デバイス内でのアプリ間連携に適しています。）
      fullPresentationUrl: sessionData.fullAuthorizationRequestUrl
    };

  } catch (error) {
    logger.error('組み合わせ検証セッションの作成に失敗しました: ', error.message);
    return { success: false, error: error.message };
  } finally {
    logger.info('*** 組み合わせ検証の終了 ***');
  }
};
