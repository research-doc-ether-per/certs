/**
 * requestQuery schema → OpenAPI parameters[]
 * @param {object|null} requestQuery
 * @returns {object[]}
 */
const convertRequestQueryToParameters = (requestQuery) => {
  if (!requestQuery || requestQuery.type !== "object") return [];

  const properties = requestQuery.properties || {};
  const requiredList = requestQuery.required || [];

  const parameters = [];

  for (const [name, schema] of Object.entries(properties)) {
    parameters.push({
      name,
      in: "query",
      required: requiredList.includes(name),
      description: schema.description || "",
      schema: stripSchemaDescription(schema),
    });
  }

  return parameters;
};

/**
 * schema から description を除外（parameter 用）
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



// ===== requestQuery → parameters =====
const queryParams = convertRequestQueryToParameters(design.requestQuery);

if (queryParams.length > 0) {
  if (!Array.isArray(op.parameters)) op.parameters = [];

  for (const qp of queryParams) {
    const exists = op.parameters.some(
      (p) => p.in === "query" && p.name === qp.name
    );
    if (!exists) {
      op.parameters.push(qp);
    }
  }
}
