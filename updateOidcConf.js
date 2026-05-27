import { NextResponse } from 'next/server';
import axios from 'axios';

import { logger } from '@/lib/default-logger';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_CLOUD_ISSUER_API_URL;

    const config = {
      url: `${baseUrl}/issuer/credential/configurations`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await axios(config);
    const status = response.status;
    const data = response.data || {};

    if (status !== 200 || Object.keys(data).length === 0) {
      throw new Error('Failed to get configurations.');
    }

    const configurations = Object.fromEntries(
      Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
    );

    const result = {
      credential_configurations_supported: configurations,
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
