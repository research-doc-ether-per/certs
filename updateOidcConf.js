
import { NextResponse } from 'next/server';
import axios from 'axios';

import { logger } from '@/lib/default-logger';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * CORS preflight request 用
 *
 * @returns {NextResponse} CORS response
 */
export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
};

/**
 * GET系
 *
 * @param {string} url 取得対象 URL
 * @returns {Promise<object>} 取得結果
 */
const handleGet = async (url) => {
  logger.debug('*** handleGet ***');

  try {
    const config = {
      url,
      method: 'GET',
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const response = await axios(config);
    logger.debug('response:', response);

    const status = response.status;
    const data = response.data || {};

    if (status !== 200 || Object.keys(data).length === 0) {
      throw new Error('Failed to get configurations.');
    }

    return data;
  } catch (error) {
    logger.error('error.message:', error.message);
    logger.error('error.stack:', error.stack);
    throw error;
  }
};

export async function GET() {
  try {
    const envKeys = Object.keys(process.env);

    const issuers = envKeys
      .filter((key) => key.startsWith('SUPPORTED_VERIFIABLE_ISSUER_'))
      .map((key) => process.env[key])
      .filter(Boolean);

    logger.debug('issuers:', issuers);

    let tempData = {};

    for (let index = 0; index < issuers.length; index += 1) {
      const issuer = issuers[index];

      try {
        const configurations = await handleGet(
          `${issuer}/.well-known/openid-credential-issuer`
        );

        const supported =
          configurations?.credential_configurations_supported || {};

        const supportedKeys = Object.keys(supported);

        for (const key of supportedKeys) {
          const item = supported[key];

          tempData = {
            ...tempData,
            [key]: {
              format: item.format,
              credential_metadata: item?.credential_metadata || {},
            },
          };
        }

        const base4Info = await handleGet(
          `${issuer}/.well-known/base_4_info.json`
        );

        if (
          base4Info &&
          typeof base4Info === 'object' &&
          Object.keys(base4Info).length > 0
        ) {
          const type = 'base_4_info';
          const format = 'vc+sd-jwt';

          tempData = {
            ...tempData,
            [`${type}_${format}`]: {
              vct: base4Info.vct,
              format,
              credential_metadata: {
                display: base4Info?.display || [],
                claims: base4Info?.claims || [],
              },
            },
          };
        }
      } catch (error) {
        logger.error('issuer metadata error:', issuer);
        logger.error('error.message:', error.message);
        logger.error('error.stack:', error.stack);

        // ここでは throw しない。
        // 1つの issuer 取得に失敗しても、他の issuer の取得処理は継続する。
      }
    }

    tempData = Object.fromEntries(
      Object.entries(tempData).sort(([a], [b]) => a.localeCompare(b))
    );

    logger.debug('tempData:', tempData);

    const result = {
      credential_configurations_supported: tempData,
    };

    return NextResponse.json(result, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    logger.error('error.message:', error.message);
    logger.error('error.stack:', error.stack);

    return NextResponse.json(
      {},
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }
}
