// https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-12
const mergeByKey = (arr1, arr2) => {
  const map = new Map()

  ;[...arr1, ...arr2].forEach(item => {
    if (map.has(item.key)) {
      map.set(item.key, {
        ...map.get(item.key),
        ...item
      })
    } else {
      map.set(item.key, item)
    }
  })

  return Array.from(map.values())
}

const result = mergeByKey(arr1, arr2)
