val credentialSubjects = credentials.mapIndexed { index, credential ->
    println("--- Processing credential at index $index ---")
    
    // 1. Get raw JSON primitive content
    val primitiveContent = credential.jsonPrimitive.content
    println("1. Raw JWS string content:\n$primitiveContent\n")
    
    // 2. Decode JWS and get its payload
    val jws = primitiveContent.decodeJws()
    val payload = jws.payload
    println("2. Decoded JWS payload claims:\n$payload\n")
    
    // 3. Extract the "sub" element
    val subElement = payload["sub"] ?: throw NullPointerException("Field 'sub' not found in the payload of credential at index $index!")
    val subContent = subElement.jsonPrimitive.content
    println("3. Extracted raw 'sub' value: $subContent")
    
    // 4. Split by '#' to remove any key ID parts (e.g., did:example:123#key-1 -> did:example:123)
    val finalSub = subContent.split("#").first()
    println("4. Final subject DID after filtering '#': $finalSub")
    println("-----------------------------------------\n")
    
    finalSub // Return the extracted DID for the map
}

// Print the final aggregated list
println("==== Final credentialSubjects List ====")
println(credentialSubjects)
