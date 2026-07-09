
/**
 * Keycloak から取得した group path の配列を階層構造の object に変換する
 *
 * 各階層は group 名を key として保持する。子 group が存在しない場合は空 object として保持する。
 */
export const convertGroupsToNestedTree = (groups = []) => {
  const tree = {}

  groups.forEach((groupPath) => {
    const levels = groupPath.split('/').filter(Boolean)

    let current = tree

    levels.forEach((level) => {
      if (!current[level]) {
        current[level] = {}
      }

      current = current[level]
    })
  })

  return tree
}
