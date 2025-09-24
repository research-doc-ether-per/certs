{
  "@context": {
    "@version": 1.1,
    "id": "@id",
    "type": "@type",

    "VerifiableCredential": "https://www.w3.org/2018/credentials#VerifiableCredential",

    "issuer": {
      "@id": "https://www.w3.org/2018/credentials#issuer",
      "@type": "@id"
    },
    "issuanceDate": {
      "@id": "https://www.w3.org/2018/credentials#issuanceDate",
      "@type": "https://www.w3.org/2001/XMLSchema#dateTime"
    },
    "expirationDate": {
      "@id": "https://www.w3.org/2018/credentials#expirationDate",
      "@type": "https://www.w3.org/2001/XMLSchema#dateTime"
    },

    "sub": {
      "@id": "http://localhost:3000/vocab#sub",
      "@type": "@id"
    },

    "credentialSubject": {
      "@id": "https://www.w3.org/2018/credentials#credentialSubject",
      "@context": {
        "credentialInformation": {
          "@id": "http://localhost:3000/vocab#credentialInformation",
          "@context": {
            "certName": {
              "@id": "http://localhost:3000/vocab#certName",
              "@type": "https://www.w3.org/2001/XMLSchema#string"
            },
            "certExplanation": {
              "@id": "http://localhost:3000/vocab#certExplanation",
              "@type": "https://www.w3.org/2001/XMLSchema#string"
            },
            "issuanceDate": {
              "@id": "https://www.w3.org/2018/credentials#issuanceDate",
              "@type": "https://www.w3.org/2001/XMLSchema#dateTime"
            },
            "expirationDate": {
              "@id": "https://www.w3.org/2018/credentials#expirationDate",
              "@type": "https://www.w3.org/2001/XMLSchema#dateTime"
            },
            "image": {
              "@id": "https://schema.org/image",
              "@type": "@id"
            },
            "docId": {
              "@id": "http://localhost:3000/vocab#docId",
              "@type": "https://www.w3.org/2001/XMLSchema#string"
            },
            "organization": {
              "@id": "http://localhost:3000/vocab#organization",
              "@type": "https://www.w3.org/2001/XMLSchema#string"
            },
            "issuedAt": {
              "@id": "http://localhost:3000/vocab#issuedAt",
              "@type": "https://www.w3.org/2001/XMLSchema#date"
            },
            "type": {
              "@id": "http://localhost:3000/vocab#type",
              "@type": "https://www.w3.org/2001/XMLSchema#string"
            },
            "category": {
              "@id": "http://localhost:3000/vocab#category",
              "@type": "https://www.w3.org/2001/XMLSchema#string"
            },
            "position": {
              "@id": "http://localhost:3000/vocab#position",
              "@type": "https://www.w3.org/2001/XMLSchema#string"
            },
            "from": {
              "@id": "http://localhost:3000/vocab#from",
              "@type": "https://www.w3.org/2001/XMLSchema#date"
            },
            "to": {
              "@id": "http://localhost:3000/vocab#to",
              "@type": "https://www.w3.org/2001/XMLSchema#date"
            }
          }
        }
      }
    }
  }
}
