// 事前に定義したオンボーディング用のサービス（メソッド群）をインポートします
const { onboardIaca, onboardDocumentSigner, onboardIssuer } = require('./issuerService');

/**
 * Issuer Onboarding Service のデモ実行関数
 * 動的な日付と日本向けの設定値を使用して3つのオンボーディングAPIをステップ順に呼び出します
 */
const runIssuerOnboardingDemo = async () => {
  logger.debug('*** runIssuerOnboardingDemo start ***');

  try {
    logger.info('--- Issuer Onboarding Service デモプロセスの開始 ---');

    // ------------------------------------------
    // 動的な日付データの生成（ISO 8601 形式）
    // ------------------------------------------
    const now = new Date();
    
    // 現在時刻（IACA の開始時刻）
    const iacaNotBefore = now.toISOString(); 
    
    // IACA の有効期限：現在から20年後（仕様上の最長期間）
    const iacaNotAfter = new Date(now.getFullYear() + 20, now.getMonth(), now.getDate()).toISOString();

    // Document Signer の開始時刻（IACA の1分後）
    const dsNotBefore = new Date(now.getTime() + 60 * 1000).toISOString();
    
    // Document Signer の有効期限：現在から1年後（仕様上の上限457日以内を満たす365日後）
    const dsNotAfter = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();


    // ------------------------------------------
    // 1. /onboard/iso-mdl/iacas の呼び出し
    // ------------------------------------------
    logger.info('サンプル実行 [1/3]: mDL用の IACA 証明書発行APIを呼び出します');
    
    const iacaParams = {
      certificateData: {
        country: 'JP',
        commonName: '日本国内自動車運転免許認証局',
        issuerAlternativeNameConf: {
          email: 'iaca@digital.go.jp',
          uri: 'https://iaca.digital.go.jp'
        },
        stateOrProvinceName: '東京都',
        organizationName: 'デジタル庁',
        notBefore: iacaNotBefore,
        notAfter: iacaNotAfter,
        crlDistributionPointUri: 'https://crl.digital.go.jp/iaca.crl'
      }
    };
    
    const iacaResult = await onboardIaca(iacaParams);
    logger.info('サンプル実行 [1/3]: IACA 証明書の作成が完了しました');


    // ------------------------------------------
    // 2. /onboard/iso-mdl/document-signers の呼び出し
    // ------------------------------------------
    logger.info('サンプル実行 [2/3]: mDL用の Document Signer 証明書発行APIを呼び出します');
    
    const dsParams = {
      iacaSigner: {
        iacaKey: {
          type: 'jwk',
          jwk: {
            kty: 'EC',
            d: 'u-UvsghdzpSXv5HmG5ngvm4Dv8yyRYw9fKA6mdp1KWs',
            crv: 'P-256',
            kid: 'R_E_QZ-Ea6etoAdWfUHSjjexRYz447ffnnfIO9kxn_Y',
            x: 'n_b1GmZTSEhioK3z8MGqcb7nxXqyjFaLR-OfKOnspwU',
            y: 'nGRVvuHTtEAZ1HjgdLaLZnYxrkiRV_e4V2Wz0qVWa-M'
          }
        },
        certificateData: {
          country: 'JP',
          commonName: '日本国内自動車運転免許認証局',
          notBefore: iacaNotBefore,
          notAfter: iacaNotAfter,
          issuerAlternativeNameConf: {
            email: 'iaca@digital.go.jp',
            uri: 'https://iaca.digital.go.jp'
          },
          stateOrProvinceName: '東京都',
          organizationName: 'デジタル庁',
          crlDistributionPointUri: 'https://crl.digital.go.jp/iaca.crl'
        }
      },
      certificateData: {
        country: 'JP',
        commonName: 'デジタル庁 関東運輸局担当部門',
        crlDistributionPointUri: 'https://crl.digital.go.jp/ds.crl',
        stateOrProvinceName: '東京都',
        organizationName: 'デジタル庁',
        localityName: '千代田区紀尾井町',
        notBefore: dsNotBefore,
        notAfter: dsNotAfter
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
