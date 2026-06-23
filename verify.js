// 先ほど作成したサービス（メソッド群）をインポートします
const { onboardIaca, onboardDocumentSigner, onboardIssuer } = require('./issuerService');

/**
 * Issuer Onboarding Service のデモ実行関数
 * 3つのオンボーディングAPIをステップ順に呼び出します
 */
const runIssuerOnboardingDemo = async () => {
  logger.debug('*** runIssuerOnboardingDemo start ***');

  try {
    logger.info('--- Issuer Onboarding Service デモプロセスの開始 ---');

    // ------------------------------------------
    // 1. /onboard/iso-mdl/iacas の呼び出し
    // ------------------------------------------
    logger.info('サンプル実行 [1/3]: mDL用の IACA 証明書発行APIを呼び出します');
    const iacaParams = {
      keyGenerationRequest: {
        keyType: 'Ed25519'
      },
      onboardRequestDid: {
        didMethod: 'jwk'
      }
    };
    
    const iacaResult = await onboardIaca(iacaParams);
    logger.info('サンプル実行 [1/3]: IACA 証明書の作成が完了しました');


    // ------------------------------------------
    // 2. /onboard/iso-mdl/document-signers の呼び出し
    // ------------------------------------------
    logger.info('サンプル実行 [2/3]: mDL用の Document Signer 証明書発行APIを呼び出します');
    const dsParams = {
      keyGenerationRequest: {
        keyType: 'Ed25519'
      }
    };

    const dsResult = await onboardDocumentSigner(dsParams);
    logger.info('サンプル実行 [2/3]: Document Signer 証明書の作成が完了しました');


    // ------------------------------------------
    // 3. /onboard/issuer の呼び出し
    // ------------------------------------------
    logger.info('サンプル実行 [3/3]: 新しい Issuer のオンボーディングAPIを呼び出します');
    const issuerParams = {
      didMethod: 'jwk',
      keyType: 'Ed25519'
    };

    const issuerResult = await onboardIssuer(issuerParams);
    logger.info('サンプル実行 [3/3]: Issuer のオンボーディングが完了しました');


    // ------------------------------------------
    // デモ結果の出力
    // ------------------------------------------
    logger.info('--- Issuer Onboarding Service デモプロセスが正常に終了しました ---');
    logger.debug('デモ実行結果一覧:', JSON.stringify({
      iacaResult,
      documentSignerResult: dsResult,
      issuerResult
    }, null, 2));

  } catch (error) {
    logger.error('Issuer Onboarding デモ実行中にエラーが検知されたため、処理を中断しました');
    logger.error('エラー原因: ', error.message);
  } finally {
    logger.debug('*** runIssuerOnboardingDemo end ***');
  }
};

// デモの実行
runIssuerOnboardingDemo();
