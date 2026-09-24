    "userId" = "THIS WILL BE REPLACED WITH ID TOKEN CLAIM"
    "userName" = "THIS WILL BE REPLACED WITH ID TOKEN CLAIM"

idTokenClaimsMapping = {
  "$.userId" = "$.credentialSubject.userId"
  "$.userName" = "$.credentialSubject.userName"
}



  idTokenClaimsMapping: config.idTokenClaimsMapping ?? null,
