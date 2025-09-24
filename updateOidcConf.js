{
  "@context": {
    "@version": 1.1,
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",

    "sub": {
      "@id": "http://localhost:3000/vocab#sub",
      "@type": "@id"
    },
    "credentialInformation": {
      "@id": "http://localhost:3000/vocab#credentialInformation"
    },
    "CustomCredential": {
      "@id": "http://localhost:3000/vocab#CustomCredential"
    },

    "certName": {
      "@id": "http://localhost:3000/vocab#certName",
      "@type": "xsd:string"
    },
    "certExplanation": {
      "@id": "http://localhost:3000/vocab#certExplanation",
      "@type": "xsd:string"
    },
    "docId": {
      "@id": "http://localhost:3000/vocab#docId",
      "@type": "xsd:string"
    },
    "organization": {
      "@id": "http://localhost:3000/vocab#organization",
      "@type": "xsd:string"
    },
    "image": {
      "@id": "https://schema.org/image",
      "@type": "@id"
    },
    "issuanceDate": {
      "@id": "https://www.w3.org/2018/credentials#issuanceDate",
      "@type": "xsd:dateTime"
    },
    "expirationDate": {
      "@id": "https://www.w3.org/2018/credentials#expirationDate",
      "@type": "xsd:dateTime"
    },
    "issuedAt": {
      "@id": "http://localhost:3000/vocab#issuedAt",
      "@type": "xsd:date"
    },
    "category": {
      "@id": "http://localhost:3000/vocab#category",
      "@type": "xsd:string"
    },
    "position": {
      "@id": "http://localhost:3000/vocab#position",
      "@type": "xsd:string"
    },
    "from": {
      "@id": "http://localhost:3000/vocab#from",
      "@type": "xsd:date"
    },
    "to": {
      "@id": "http://localhost:3000/vocab#to",
      "@type": "xsd:date"
    }
  }
}

