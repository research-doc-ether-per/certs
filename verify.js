/**
 * requestQuery(schema) を OpenAPI parameters(in=query) に反映する
 * @param {object} op OpenAPI operation
 * @param {object|null} requestQuery schema (type: object)
 * @returns {void}
 */
const applyRequestQuery = (op, requestQuery) => {
  if (!requestQuery || requestQuery.type !== "object") return;

  const props = requestQuery.properties || {};
  const requiredList = Array.isArray(requestQuery.required) ? requestQuery.required : [];

  if (!Array.isArray(op.parameters)) op.parameters = [];

  for (const [name, schema] of Object.entries(props)) {
    // 既存 query parameter があれば上書き、なければ追加
    const idx = op.parameters.findIndex((p) => p && p.in === "query" && p.name === name);

    const param = {
      name,
      in: "query",
      required: requiredList.includes(name),
      description: schema && schema.description ? schema.description : "",
      schema: stripSchemaDescription(schema),
    };

    if (idx >= 0) op.parameters[idx] = param;
    else op.parameters.push(param);
  }
};

/**
 * schema から description を除外（parameter.schema 用）
 * @param {object} schema
 * @returns {object}
 */
const stripSchemaDescription = (schema) => {
  if (!schema || typeof schema !== "object") return schema;

  const copy = { ...schema };
  delete copy.description;

  if (copy.type === "object" && copy.properties) {
    const newProps = {};
    for (const [k, v] of Object.entries(copy.properties)) {
      newProps[k] = stripSchemaDescription(v);
    }
    copy.properties = newProps;
  }

  if (copy.type === "array" && copy.items) {
    copy.items = stripSchemaDescription(copy.items);
  }

  return copy;
};


// requestQuery 更新
applyRequestQuery(op, design.requestQuery)
