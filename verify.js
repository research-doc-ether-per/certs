const exampleDataObj = JSON.parse(exampleData);

for (const endpoint of endpoints) {
  const matchedExample = exampleDataObj.find(e => e.api === endpoint.api && e.method === endpoint.method);

  if (matchedExample) {
    if (endpoint.requestQuery) {
      applyExampleToSchema(endpoint.requestQuery, matchedExample.requestQuery);
    } else if (matchedExample.requestQuery) {
      endpoint.requestQuery = {
        type: 'object',
        properties: {}
      };
      for (const key of Object.keys(matchedExample.requestQuery)) {
        endpoint.requestQuery.properties[key] = { type: typeof matchedExample.requestQuery[key] === 'number' ? 'number' : 'string' };
      }
      applyExampleToSchema(endpoint.requestQuery, matchedExample.requestQuery);
    }

    if (endpoint.requestBody) {
      applyExampleToSchema(endpoint.requestBody, matchedExample.requestBody);
    }

    if (endpoint.responseBody) {
      applyExampleToSchema(endpoint.responseBody, matchedExample.responseBody);
    }
  }
}


const applyExampleToSchema = (schema, exampleData) => {
  if (!schema || typeof schema !== 'object') return;

  const walk = (node, example) => {
    if (!node || typeof node !== 'object') return;

    const isLeafType = ['string', 'integer', 'number', 'boolean'].includes(node.type);

    if (isLeafType) {
      if (example !== undefined) {
        node.example = example;
      } else {
        node.example = node.type === 'string' ? '' : (node.type === 'boolean' ? false : 0);
      }
      return;
    }

    if (node.type === 'object' && node.properties) {
      for (const key of Object.keys(node.properties)) {
        walk(node.properties[key], example ? example[key] : undefined);
      }
      return;
    }

    if (node.type === 'array' && node.items) {
      if (Array.isArray(example) && example.length > 0) {
        walk(node.items, example[0]);
        node.example = JSON.stringify(example);
      } else {
        node.example = '[]';
        walk(node.items, undefined);
      }
    }
  };

  walk(schema, exampleData);
};
