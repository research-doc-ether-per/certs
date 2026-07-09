/**
 * Keycloak から取得した group path の配列を階層構造の object に変換する
 * 各階層は group 名を key として保持する。
 * 子 group が存在しない場合は空 object として保持する。
 *
 * @param {string[]} groups
 * Keycloak から取得した group path の配列。
 * 例: ['/group1/group1-3', '/group2/group2-1/group2-1-1']
 *
 * @returns {Object}
 * group path を階層構造に変換した object。
 * 各 group 名を key とし、子 group が存在しない場合は空 object を返す。
 */
