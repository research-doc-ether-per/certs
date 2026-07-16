/**
 * Credential Offer Endpointを取得する
 *
 * 指定されたgroupIdに紐づくレコードを優先して取得する
 * 同一URLのレコードが存在しない場合は、共通設定（group_id = 'all'）のレコードを取得する
 *
 * endpointUrlが指定された場合は対象URLのみを取得し、指定されていない場合はEndpoint一覧を取得する
 *
 * @param {Object} client PostgreSQLクライアント
 * @param {string} groupId 組織ID
 * @param {string|null} endpointUrl Endpoint URL
 * @returns {Promise<Array<Object>>} Credential Offer Endpoint一覧
 */
const getCredentialOfferEndpoints = async (
  client,
  groupId,
  endpointUrl = null
) => {
  // SQLのバインドパラメーターを設定する
  // $1：リクエストで指定されたgroupId
  // $2：共通設定を表す固定値
  const values = [groupId, 'all']

  // endpointUrlが指定されていない場合は、
  // URLによる絞り込み条件を追加しない
  let endpointCondition = ''

  if (endpointUrl) {
    // endpointUrlをバインドパラメーターに追加する
    values.push(endpointUrl)

    // values.lengthを使用して、
    // 追加したendpointUrlに対応するプレースホルダーを設定する
    endpointCondition = `AND t1.url = $${values.length}`
  }

  const sql = `
    SELECT
      t2.group_id,
      t2.url,
      t2.name,
      t2.create_date
    FROM (
      SELECT
        t1.*,

        -- 同一URLごとに優先順位を設定する
        ROW_NUMBER() OVER (
          PARTITION BY t1.url
          ORDER BY
            -- リクエストで指定されたgroupIdに紐づくレコードを優先する
            CASE
              WHEN t1.group_id = $1 THEN 1
              ELSE 0
            END DESC,

            -- 同一groupId内に複数レコードが存在する場合は、
            -- 作成日時が新しいレコードを優先する
            t1.create_date DESC
        ) AS priority

      FROM credential_offer_endpoints t1

      -- 指定されたgroupIdと共通設定のレコードを検索対象とする
      WHERE t1.group_id IN ($1, $2)

        -- endpointUrlが指定された場合のみ、
        -- 対象URLでレコードを絞り込む
        ${endpointCondition}
    ) AS t2

    -- URLごとに最も優先度の高いレコードのみを取得する
    WHERE t2.priority = 1

    -- 一覧取得時は作成日時の降順で返却する
    ORDER BY t2.create_date DESC
  `

  const { rows } = await client.query(sql, values)

  return rows
}
