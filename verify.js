const filtered = React.useMemo(() => {
  const k = keyword.trim().toLowerCase();

  // 半角スペースが含まれているかどうか
  const hasSpace = k.includes(' ');

  let userKey = '';
  let vcKey = '';
  if (hasSpace) {
    const parts = k.split(' ');
    userKey = (parts[0] || '').trim();
    vcKey = (parts[1] || '').trim();
  }

  return targets.filter((r) => {
    const user = String(r.userId || '').toLowerCase();
    const vc = String(r.vcName || '').toLowerCase();

    let hitKeyword = false;

    if (!k) {
      // キーワード未入力の場合は常にヒット
      hitKeyword = true;
    } else if (hasSpace) {
      // スペースあり：ユーザ名＋証明書名の「組み合わせ検索」
      hitKeyword =
        (!userKey || user.includes(userKey)) &&
        (!vcKey || vc.includes(vcKey));
    } else {
      // スペースなし：ユーザ名 or 証明書名 どちらかに含まれていればヒット
      hitKeyword = user.includes(k) || vc.includes(k);
    }

    // 失効状態フィルタ
    const hitRevoked = !onlyRevoked || String(r.revoked) === '1';

    return hitKeyword && hitRevoked;
  });
}, [targets, keyword, onlyRevoked]);

