 {
      source: '/dids/:path*',
      headers: [
        { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        { key: 'Cache-Control', value: 'public, max-age=0' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    }
