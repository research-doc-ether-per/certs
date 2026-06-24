
{
  "flow_type": "cross_device",
  "core_flow": {
    "dcql_query": {
      "credentials": [
        {
          "id": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
          "format": "dc+sd-jwt",
          "meta": {
            "vct_values": [
              "http://waltid.enterprise.localhost:3000/v1/waltid.issuer/issuer-service-api/openid4vc/draft13/identity_credential"
            ]
          }
        }
      ]
    },
    "policies": {
      "vp_policies": {
        "jwt_vc_json": [],
        "dc+sd-jwt": [
          "dc+sd-jwt/audience-check",
          "dc+sd-jwt/kb-jwt_signature",
          "dc+sd-jwt/nonce-check",
          "dc+sd-jwt/sd_hash-check"
        ],
        "mso_mdoc": []
      },
      "vc_policies": [
        { "policy": "signature" },
        { "policy": "expiration" },
        { "policy": "not-before" }
      ]
    }
  }
}
