 {
          "policy": "allowed-issuer",
          "allowed_issuer": [
            "did:web:10.0.2.15%3A5101:dids:issuer01"
          ]
        },
 {
            "policy": "regex",
            "path": "$.credentialSubject.type",
            "regex": "^award$",
            "allowNull": false
          },
          {
            "policy": "regex",
            "path": "$.credentialSubject.issuedAt",
            "regex": "^\\d{4}/(0[1-9]|1[0-2])/([0-2]\\d|3[01])$",
            "allowNull": false
          }

 {
            "policy": "regex",
            "path": "$.credentialSubject.category",
            "regex": "^sales$",
            "allowNull": false
          },
          {
            "policy": "regex",
            "path": "$.credentialSubject.position",
            "regex": "^(director|manager)$",
            "allowNull": false
          },
          {
            "policy": "regex",
            "path": "$.credentialSubject.from",
            "regex": "^\\d{4}/(0[1-9]|1[0-2])$",
            "allowNull": false
          },
          {
            "policy": "regex",
            "path": "$.credentialSubject.to",
            "regex": "^\\d{4}/(0[1-9]|1[0-2])$",
            "allowNull": false
          }


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
            "pattern": "^test[0-9]{2}$"
          },
          "category": {
            "type": "string",
            "enum": [
              "sales",
              "engineering",
              "management"
            ]
          },
          "position": {
            "type": "string",
            "enum": [
              "director",
              "manager"
            ]
          },
          "from": {
            "type": "string",
            "pattern": "^\\d{4}/(0[1-9]|1[0-2])$"
          },
          "to": {
            "type": "string",
            "pattern": "^\\d{4}/(0[1-9]|1[0-2])$"
          }
        },
        "required": [
          "organization",
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
