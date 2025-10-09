app.get('/status/:id.json', (req, res) => {
  const id = String(req.params.id).replace(/[^0-9A-Za-z_-]/g, '');
  const file = path.join(process.cwd(), 'public', 'status', `${id}.json`);

  fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
      const body = JSON.stringify({ error: 'not found' });
      console.log(`[status] 404 /status/${id}.json -> ${body.length} bytes`);
      return res.status(404)
        .type('application/json; charset=utf-8')
        .set({
          'Cache-Control': 'no-store',
          'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
          'Content-Encoding': 'identity',
          'Accept-Ranges': 'none',
          'Connection': 'close'
        })
        .send(body);
    }

    const body = (data ?? '').trim();
    if (!body) {
      const errBody = JSON.stringify({ error: 'empty status file' });
      console.log(`[status] 500 /status/${id}.json -> 0 bytes`);
      return res.status(500)
        .type('application/json; charset=utf-8')
        .set({
          'Cache-Control': 'no-store',
          'Content-Length': Buffer.byteLength(errBody, 'utf8').toString(),
          'Content-Encoding': 'identity',
          'Accept-Ranges': 'none',
          'Connection': 'close'
        })
        .send(errBody);
    }

    console.log(`[status] 200 /status/${id}.json -> ${body.length} bytes`);
    return res.status(200)
      .type('application/json; charset=utf-8')
      .set({
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
        'Content-Encoding': 'identity',   
        'Accept-Ranges': 'none',         
        'Connection': 'close'            
      })
      .send(body);
  });
});

