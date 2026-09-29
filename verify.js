const express = require("express");
const AwardsService = require("./src/services/AwardsService");
const CareerService = require("./src/services/CareerService");

const app = express();

const PORT = process.env.PORT || 3200;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.get("/vct/awards", AwardsService.getAwardsMetadata(BASE_URL));
app.get("/vct/awards/info", AwardsService.getAwardsMetadataInfo(BASE_URL));

app.get("/vct/career", CareerService.getCareerMetadata(BASE_URL));
app.get("/vct/career/info", CareerService.getCareerMetadataInfo(BASE_URL));

app.listen(PORT, () => {
  console.log(`VCT metadata server is running on port ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
});


const crypto = require("crypto");

/**
 * JSON を文字列化する。
 *
 * vct-integrity では、実際に取得される Type Metadata のバイト列をもとに
 * hash が計算されるため、integrity 計算時とレスポンス返却時で
 * 同じ JSON 文字列を使用する必要がある。
 */
const stringifyMetadata = async (metadata) => {
  console.debug("*** stringifyMetadata start ***");

  try {
    const result = JSON.stringify(metadata);

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** stringifyMetadata end ***");
  }
};

/**
 * vct-integrity 用の integrity 値を生成する。
 *
 * 形式：
 * sha256-xxxxxxxx
 */
const generateIntegrity = async (metadataBody) => {
  console.debug("*** generateIntegrity start ***");

  try {
    const digest = crypto
      .createHash("sha256")
      .update(metadataBody, "utf8")
      .digest("base64");

    const result = `sha256-${digest}`;

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** generateIntegrity end ***");
  }
};

/**
 * Type Metadata を response として返却する。
 */
const sendMetadata = async (res, metadata) => {
  console.debug("*** sendMetadata start ***");

  try {
    const body = await stringifyMetadata(metadata);

    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(body);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    return res.status(500).json({
      message: "Internal server error."
    });
  } finally {
    console.debug("*** sendMetadata end ***");
  }
};

/**
 * Type Metadata の vct / integrity 確認用情報を response として返却する。
 */
const sendMetadataInfo = async (res, metadata) => {
  console.debug("*** sendMetadataInfo start ***");

  try {
    const body = await stringifyMetadata(metadata);
    const integrity = await generateIntegrity(body);

    const result = {
      vct: metadata.vct,
      integrity,
      metadata
    };

    console.debug("result : ", result);

    return res.status(200).json(result);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    return res.status(500).json({
      message: "Internal server error."
    });
  } finally {
    console.debug("*** sendMetadataInfo end ***");
  }
};

module.exports = {
  stringifyMetadata,
  generateIntegrity,
  sendMetadata,
  sendMetadataInfo
};


const {
  sendMetadata,
  sendMetadataInfo
} = require("../utils/metadataUtils");

/**
 * Awards 用 Type Metadata を作成する。
 */
const createAwardsMetadata = async (baseUrl) => {
  console.debug("*** createAwardsMetadata start ***");

  try {
    const result = {
      vct: `${baseUrl}/vct/awards`,
      name: "Awards Credential",
      description: "Type metadata for Awards VC used in vct-integrity test",
      schema: {
        type: "object",
        properties: {
          issuedAt: {
            type: "string",
            description: "Award date. Format: YYYY/MM/DD"
          }
        },
        required: ["issuedAt"]
      }
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** createAwardsMetadata end ***");
  }
};

/**
 * Awards Type Metadata を返却する。
 */
const getAwardsMetadata = (baseUrl) => {
  return async (req, res) => {
    console.debug("*** GET /vct/awards start ***");

    try {
      const metadata = await createAwardsMetadata(baseUrl);
      return await sendMetadata(res, metadata);
    } catch (error) {
      console.error("error.message: ", error.message);
      console.error("error.stack: ", error.stack);

      return res.status(500).json({
        message: "Internal server error."
      });
    } finally {
      console.debug("*** GET /vct/awards end ***");
    }
  };
};

/**
 * Awards Type Metadata の vct / integrity 確認用情報を返却する。
 */
const getAwardsMetadataInfo = (baseUrl) => {
  return async (req, res) => {
    console.debug("*** GET /vct/awards/info start ***");

    try {
      const metadata = await createAwardsMetadata(baseUrl);
      return await sendMetadataInfo(res, metadata);
    } catch (error) {
      console.error("error.message: ", error.message);
      console.error("error.stack: ", error.stack);

      return res.status(500).json({
        message: "Internal server error."
      });
    } finally {
      console.debug("*** GET /vct/awards/info end ***");
    }
  };
};

module.exports = {
  getAwardsMetadata,
  getAwardsMetadataInfo
};


const {
  sendMetadata,
  sendMetadataInfo
} = require("../utils/metadataUtils");

/**
 * Career 用 Type Metadata を作成する。
 */
const createCareerMetadata = async (baseUrl) => {
  console.debug("*** createCareerMetadata start ***");

  try {
    const result = {
      vct: `${baseUrl}/vct/career`,
      name: "Career Credential",
      description: "Type metadata for Career VC used in vct-integrity test",
      schema: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "Employment start month. Format: YYYY/MM"
          },
          to: {
            type: "string",
            description: "Employment end month. Format: YYYY/MM"
          }
        },
        required: ["from", "to"]
      }
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** createCareerMetadata end ***");
  }
};

/**
 * Career Type Metadata を返却する。
 */
const getCareerMetadata = (baseUrl) => {
  return async (req, res) => {
    console.debug("*** GET /vct/career start ***");

    try {
      const metadata = await createCareerMetadata(baseUrl);
      return await sendMetadata(res, metadata);
    } catch (error) {
      console.error("error.message: ", error.message);
      console.error("error.stack: ", error.stack);

      return res.status(500).json({
        message: "Internal server error."
      });
    } finally {
      console.debug("*** GET /vct/career end ***");
    }
  };
};

/**
 * Career Type Metadata の vct / integrity 確認用情報を返却する。
 */
const getCareerMetadataInfo = (baseUrl) => {
  return async (req, res) => {
    console.debug("*** GET /vct/career/info start ***");

    try {
      const metadata = await createCareerMetadata(baseUrl);
      return await sendMetadataInfo(res, metadata);
    } catch (error) {
      console.error("error.message: ", error.message);
      console.error("error.stack: ", error.stack);

      return res.status(500).json({
        message: "Internal server error."
      });
    } finally {
      console.debug("*** GET /vct/career/info end ***");
    }
  };
};

module.exports = {
  getCareerMetadata,
  getCareerMetadataInfo
};

{
  "name": "vct-metadata-server",
  "version": "1.0.0",
  "description": "Minimal metadata server for vct-integrity testing",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}


# VCT Metadata Server

Verifier API 2 の `vct-integrity` policy の動作確認用の最小 Metadata Server です。

この server は SD-JWT VC の Type Metadata を返却します。



## ファイル構成

```text
vct-metadata-server/
├── app.js
├── package.json
├── README.md
└── src/
    ├── services/
    │   ├── AwardsService.js
    │   └── CareerService.js
    └── utils/
        └── metadataUtils.js
```



## Endpoint

### Awards Type Metadata

```http
GET /vct/awards
```


```bash
# 例：
curl http://localhost:3200/vct/awards
```

### Career Type Metadata

```http
GET /vct/career
```


```bash
# 例：
curl http://localhost:3200/vct/career
```

## vct / vct#integrity 確認用 endpoint

### Awards

```http
GET /vct/awards/info
```


```bash
# 例：
curl http://localhost:3200/vct/awards/info
```

SD-JWT VC の payload には、以下のように設定します。

```json
{
  "vct": "http://localhost:3200/vct/awards",
  "vct#integrity": "sha256-xxxxxxxx"
}
```

### Career

```http
GET /vct/career/info
```

例：

```bash
curl http://localhost:3200/vct/career/info
```

SD-JWT VC の payload には、以下のように設定します。

```json
{
  "vct": "http://localhost:3200/vct/career",
  "vct#integrity": "sha256-xxxxxxxx"
}
```

## 注意点

`vct#integrity` は、実際に取得される Type Metadata のバイト列をもとに検証されます。

そのため、以下の点に注意してください。

1. `vct` に設定した URL は、Verifier API 2 からアクセスできる必要があります。
2. `vct#integrity` は、実際に `/vct/awards` または `/vct/career` で返却される JSON 文字列から計算された値を使用してください。
3. Type Metadata の内容を変更した場合、`vct#integrity` も再取得してください。
4. `BASE_URL` を変更すると Metadata 内の `vct` 値も変わるため、`vct#integrity` も変わります。

## テスト手順

### 1. Server 起動

```bash
npm install
npm start
```

### 2. Awards の vct と integrity を取得

```bash
curl http://localhost:3200/vct/awards/info
```

### 3. 取得した値を SD-JWT VC の payload に設定

```json
{
  "vct": "http://localhost:3200/vct/awards",
  "vct#integrity": "sha256-xxxxxxxx"
}
```

### 4. Verifier API 2 の policy に `vct-integrity` を指定して検証

Presentation Request 作成時に、`vct-integrity` policy を指定して動作確認します。

例：

```json
{
  "policies": {
    "vc_policies": [
      "vct-integrity"
    ]
  }
}
```


