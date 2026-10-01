{
  "credentials": {
    "Awards_jwt_vc_json": {
      "true": {
        "id": "Awards_JWT_VERIFICATION_TRUE",
        "format": "jwt_vc_json",
        "types": [
          "Awards"
        ],
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Awards_JWT_VERIFICATION_TRUE"
            ]
          }
        ]
      },
      "false": {
        "id": "Awards_JWT_VERIFICATION_FALSE",
        "format": "jwt_vc_json",
        "types": [
          "Awards"
        ],
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Awards_JWT_VERIFICATION_FALSE"
            ]
          }
        ]
      }
    },

    "Awards_dc+sd-jwt": {
      "true": {
        "id": "Awards_SD_JWT_VERIFICATION_TRUE",
        "format": "dc+sd-jwt",
        "meta": {
          "vct_values": [
            "http://10.0.2.15:3200/vct/Awards"
          ]
        },
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Awards_SD_JWT_VERIFICATION_TRUE"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "organization"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "issuedAt"
            ]
          }
        ]
      },
      "false": {
        "id": "Awards_SD_JWT_VERIFICATION_FALSE",
        "format": "dc+sd-jwt",
        "meta": {
          "vct_values": [
            "http://10.0.2.15:3200/vct/Awards"
          ]
        },
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Awards_SD_JWT_VERIFICATION_FALSE"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "organization"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "issuedAt"
            ]
          }
        ]
      }
    },

    "Career_jwt_vc_json": {
      "true": {
        "id": "Career_JWT_VERIFICATION_TRUE",
        "format": "jwt_vc_json",
        "types": [
          "Career"
        ],
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Career_JWT_VERIFICATION_TRUE"
            ]
          }
        ]
      },
      "false": {
        "id": "Career_JWT_VERIFICATION_FALSE",
        "format": "jwt_vc_json",
        "types": [
          "Career"
        ],
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Career_JWT_VERIFICATION_FALSE"
            ]
          }
        ]
      }
    },

    "Career_dc+sd-jwt": {
      "true": {
        "id": "Career_SD_JWT_VERIFICATION_TRUE",
        "format": "dc+sd-jwt",
        "meta": {
          "vct_values": [
            "http://10.0.2.15:3200/vct/Career"
          ]
        },
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Career_SD_JWT_VERIFICATION_TRUE"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "category"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "position"
            ]
          }
        ]
      },
      "false": {
        "id": "Career_SD_JWT_VERIFICATION_FALSE",
        "format": "dc+sd-jwt",
        "meta": {
          "vct_values": [
            "http://10.0.2.15:3200/vct/Career"
          ]
        },
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Career_SD_JWT_VERIFICATION_FALSE"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "category"
            ]
          },
          {
            "path": [
              "credentialSubject",
              "position"
            ]
          }
        ]
      }
    },

    "Qualification_jwt_vc_json": {
      "true": {
        "id": "Qualification_JWT_VERIFICATION_TRUE",
        "format": "jwt_vc_json",
        "types": [
          "Qualification"
        ],
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Qualification_JWT_VERIFICATION_TRUE"
            ]
          }
        ]
      },
      "false": {
        "id": "Qualification_JWT_VERIFICATION_FALSE",
        "format": "jwt_vc_json",
        "types": [
          "Qualification"
        ],
        "claims": [
          {
            "path": [
              "credentialSubject",
              "certName"
            ],
            "values": [
              "Qualification_JWT_VERIFICATION_FALSE"
            ]
          }
        ]
      }
    }
  },

  "specific_vc_policies": {
    "Awards_jwt_vc_json": [
      {
        "policy": "regex",
        "path": "$.credentialSubject.issuedAt",
        "regex": "^\\d{4}/(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])$",
        "allowNull": false
      },
      {
        "policy": "date-within",
        "path": "$.credentialSubject.issuedAt",
        "format": "yyyy/MM/dd",
        "value": 3,
        "unit": "years",
        "allowNull": false
      }
    ],

    "Awards_dc+sd-jwt": [
      {
        "policy": "vct-integrity"
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.certName",
        "regex": "^Awards_SD_JWT_VERIFICATION_(TRUE|FALSE)$",
        "allowNull": false
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.organization",
        "regex": "^awards-sdjwt-verification-(true|false)-org$",
        "allowNull": false
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.issuedAt",
        "regex": "^\\d{4}/(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])$",
        "allowNull": false
      },
      {
        "policy": "webhook",
        "url": "http://10.0.2.15:3100/webhook/awards/issued-at/within-3-years"
      }
    ],

    "Career_jwt_vc_json": [
      {
        "policy": "regex",
        "path": "$.credentialSubject.category",
        "regex": "^sales$",
        "allowNull": false
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.position",
        "regex": "^director$",
        "allowNull": false
      },
      {
        "policy": "schema",
        "schema": {
          "type": "object",
          "properties": {
            "credentialSubject": {
              "type": "object",
              "properties": {
                "organization": {
                  "type": "string",
                  "const": "test02"
                },
                "type": {
                  "type": "string",
                  "const": "business-career-jwt"
                },
                "category": {
                  "type": "string",
                  "const": "sales"
                },
                "position": {
                  "type": "string",
                  "const": "director"
                },
                "from": {
                  "type": "string",
                  "const": "2020/10"
                },
                "to": {
                  "type": "string",
                  "const": "2025/10"
                }
              },
              "required": [
                "organization",
                "type",
                "category",
                "position",
                "from",
                "to"
              ]
            }
          },
          "required": [
            "credentialSubject"
          ]
        },
        "defaultType": null
      }
    ],

    "Career_dc+sd-jwt": [
      {
        "policy": "vct-integrity"
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.certName",
        "regex": "^Career_SD_JWT_VERIFICATION_(TRUE|FALSE)$",
        "allowNull": false
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.organization",
        "regex": "^test03$",
        "allowNull": false
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.category",
        "regex": "^engineering$",
        "allowNull": false
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.position",
        "regex": "^manager$",
        "allowNull": false
      },
      {
        "policy": "webhook",
        "url": "http://10.0.2.15:3100/webhook/career/employment-period/at-least-3-years"
      }
    ],

    "Qualification_jwt_vc_json": [
      {
        "policy": "regex",
        "path": "$.credentialSubject.type",
        "regex": "^qualifications$",
        "allowNull": false
      },
      {
        "policy": "regex",
        "path": "$.credentialSubject.issuedAt",
        "regex": "^\\d{4}/(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])$",
        "allowNull": false
      },
      {
        "policy": "date-within",
        "path": "$.credentialSubject.issuedAt",
        "format": "yyyy/MM/dd",
        "value": 3,
        "unit": "years",
        "allowNull": false
      }
    ]
  }
}
