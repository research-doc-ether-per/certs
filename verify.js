app.get('/status/:id.json', (req, res) => {
  const id = String(req.params.id).replace(/[^0-9A-Za-z_-]/g, '');
  const file = path.join(process.cwd(), 'public', 'status', `${id}.json`);

  fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
      res.status(404).type('application/json; charset=utf-8')
        .set('Cache-Control', 'no-store')
        .send(JSON.stringify({ error: 'not found' }));
      return;
    }
    const body = (data ?? '').trim();
    if (!body) {
      res.status(500).type('application/json; charset=utf-8')
        .set('Cache-Control', 'no-store')
        .send(JSON.stringify({ error: 'empty status file' }));
      return;
    }
    res.status(200).type('application/json; charset=utf-8')
      .set({ 'Cache-Control': 'no-store',
             'Content-Length': Buffer.byteLength(body, 'utf8').toString() })
      .send(body);
  });
});
