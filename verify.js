[
  {
    "id": "awards-and-b4d",
    "group_id": "all",
    "name": "表彰＋基本4情報",
    "description": "表彰（JWT）と本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": ["Awards", "B4d"],
    "vc_policies": [
      { "policy": "signature" },
      { "policy": "expiration" },
      { "policy": "not-before" },
      {
        "policy": "credential-status",
        "argument": {
          "discriminator": "w3c-list",
          "list": [
            {
              "value": 0,
              "purpose": "revocation",
              "type": "BitstringStatusList"
            }
          ]
        }
      }
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ],
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {
      "b4d": [
        { "policy": "vct-integrity" }
      ]
    },
    "dcql": {
      "credentials": [
        {
          "id": "awards",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Awards"]
            ]
          }
        },
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4d"]
          },
          "claims": [
            { "path": ["credentialSubject", "name"] },
            { "path": ["credentialSubject", "address"] },
            { "path": ["credentialSubject", "birthdate"] },
            { "path": ["credentialSubject", "gender"] }
          ]
        }
      ],
      "credential_sets": [
        {
          "options": [
            ["awards", "b4d"]
          ],
          "required": true
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "qualifications-and-b4d",
    "group_id": "all",
    "name": "資格＋基本4情報",
    "description": "資格（JWT）と本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": ["Qualifications", "B4d"],
    "vc_policies": [
      { "policy": "signature" },
      { "policy": "expiration" },
      { "policy": "not-before" },
      {
        "policy": "credential-status",
        "argument": {
          "discriminator": "w3c-list",
          "list": [
            {
              "value": 0,
              "purpose": "revocation",
              "type": "BitstringStatusList"
            }
          ]
        }
      }
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ],
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {
      "b4d": [
        { "policy": "vct-integrity" }
      ]
    },
    "dcql": {
      "credentials": [
        {
          "id": "qualifications",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Qualifications"]
            ]
          }
        },
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4d"]
          },
          "claims": [
            { "path": ["credentialSubject", "name"] },
            { "path": ["credentialSubject", "address"] },
            { "path": ["credentialSubject", "birthdate"] },
            { "path": ["credentialSubject", "gender"] }
          ]
        }
      ],
      "credential_sets": [
        {
          "options": [
            ["qualifications", "b4d"]
          ],
          "required": true
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "career-and-b4d",
    "group_id": "all",
    "name": "職歴＋基本4情報",
    "description": "職歴（JWT）と本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": ["Career", "B4d"],
    "vc_policies": [
      { "policy": "signature" },
      { "policy": "expiration" },
      { "policy": "not-before" },
      {
        "policy": "credential-status",
        "argument": {
          "discriminator": "w3c-list",
          "list": [
            {
              "value": 0,
              "purpose": "revocation",
              "type": "BitstringStatusList"
            }
          ]
        }
      }
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ],
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {
      "b4d": [
        { "policy": "vct-integrity" }
      ]
    },
    "dcql": {
      "credentials": [
        {
          "id": "career",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Career"]
            ]
          }
        },
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4d"]
          },
          "claims": [
            { "path": ["credentialSubject", "name"] },
            { "path": ["credentialSubject", "address"] },
            { "path": ["credentialSubject", "birthdate"] },
            { "path": ["credentialSubject", "gender"] }
          ]
        }
      ],
      "credential_sets": [
        {
          "options": [
            ["career", "b4d"]
          ],
          "required": true
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "awards",
    "group_id": "all",
    "name": "表彰",
    "description": "表彰（JWT）の提示を求める。",
    "credential_types": ["Awards"],
    "vc_policies": [
      { "policy": "signature" },
      { "policy": "expiration" },
      { "policy": "not-before" },
      {
        "policy": "credential-status",
        "argument": {
          "discriminator": "w3c-list",
          "list": [
            {
              "value": 0,
              "purpose": "revocation",
              "type": "BitstringStatusList"
            }
          ]
        }
      }
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ]
    },
    "specific_vc_policies": {},
    "dcql": {
      "credentials": [
        {
          "id": "awards",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Awards"]
            ]
          }
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "qualifications",
    "group_id": "all",
    "name": "資格",
    "description": "資格（JWT）の提示を求める。",
    "credential_types": ["Qualifications"],
    "vc_policies": [
      { "policy": "signature" },
      { "policy": "expiration" },
      { "policy": "not-before" },
      {
        "policy": "credential-status",
        "argument": {
          "discriminator": "w3c-list",
          "list": [
            {
              "value": 0,
              "purpose": "revocation",
              "type": "BitstringStatusList"
            }
          ]
        }
      }
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ]
    },
    "specific_vc_policies": {},
    "dcql": {
      "credentials": [
        {
          "id": "qualifications",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Qualifications"]
            ]
          }
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "career",
    "group_id": "all",
    "name": "職歴",
    "description": "職歴（JWT）の提示を求める。",
    "credential_types": ["Career"],
    "vc_policies": [
      { "policy": "signature" },
      { "policy": "expiration" },
      { "policy": "not-before" },
      {
        "policy": "credential-status",
        "argument": {
          "discriminator": "w3c-list",
          "list": [
            {
              "value": 0,
              "purpose": "revocation",
              "type": "BitstringStatusList"
            }
          ]
        }
      }
    ],
    "vp_policies": {
      "jwt_vc_json": [
        "jwt_vc_json/audience-check",
        "jwt_vc_json/nonce-check",
        "jwt_vc_json/envelope_signature"
      ]
    },
    "specific_vc_policies": {},
    "dcql": {
      "credentials": [
        {
          "id": "career",
          "format": "jwt_vc_json",
          "meta": {
            "type_values": [
              ["VerifiableCredential", "Career"]
            ]
          }
        }
      ]
    },
    "is_public": true
  },
  {
    "id": "b4d",
    "group_id": "all",
    "name": "基本4情報",
    "description": "本人の基本4情報（SD-JWT）の提示を求める。",
    "credential_types": ["B4d"],
    "vc_policies": [
      { "policy": "signature" },
      { "policy": "expiration" },
      { "policy": "not-before" },
      {
        "policy": "credential-status",
        "argument": {
          "discriminator": "w3c-list",
          "list": [
            {
              "value": 0,
              "purpose": "revocation",
              "type": "BitstringStatusList"
            }
          ]
        }
      }
    ],
    "vp_policies": {
      "dc+sd-jwt": [
        "dc+sd-jwt/audience-check",
        "dc+sd-jwt/nonce-check",
        "dc+sd-jwt/kb-jwt_signature",
        "dc+sd-jwt/sd_hash-check"
      ]
    },
    "specific_vc_policies": {
      "b4d": [
        { "policy": "vct-integrity" }
      ]
    },
    "dcql": {
      "credentials": [
        {
          "id": "b4d",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": ["B4d"]
          },
          "claims": [
            { "path": ["credentialSubject", "name"] },
            { "path": ["credentialSubject", "address"] },
            { "path": ["credentialSubject", "birthdate"] },
            { "path": ["credentialSubject", "gender"] }
          ]
        }
      ]
    },
    "is_public": true
  }
]
