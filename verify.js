private fun removeSDFields(payload: JsonObject, sdMap: Map<String, SDField>): JsonObject {
    println("[SDPAYLOAD][removeSDFields] ENTER payloadKeys=${payload.keys} sdMapKeys=${sdMap.keys}")

    val result = JsonObject(
        payload.filterKeys { key ->
            val drop = (sdMap[key]?.sd == true)
            println("[SDPAYLOAD][removeSDFields] filter key=$key drop=$drop (sd=${sdMap[key]?.sd})")
            !drop
        }.mapValues { entry ->
            val key = entry.key
            val value = entry.value
            val hasChildren = !sdMap[key]?.children.isNullOrEmpty()
            val isObj = value is JsonObject
            println("[SDPAYLOAD][removeSDFields] mapValues key=$key isObj=$isObj hasChildren=$hasChildren")

            if (isObj && hasChildren) {
                val childMap = sdMap[key]?.children ?: mapOf()
                println("[SDPAYLOAD][removeSDFields] RECURSE key=$key childMapKeys=${childMap.keys}")
                removeSDFields(value.jsonObject, childMap)
            } else {
                value
            }
        }
    )

    println("[SDPAYLOAD][removeSDFields] EXIT resultKeys=${result.keys}")
    return result
}

private fun generateSDPayload(
    payload: JsonObject,
    sdMap: SDMap,
    digests2disclosures: MutableMap<String, SDisclosure>
): JsonObject {
    println("[SDPAYLOAD][generateSDPayload] ENTER payloadKeys=${payload.keys} sdMapKeys=${sdMap.keys} decoyMode=${sdMap.decoyMode} decoys=${sdMap.decoys}")

    val sdPayload = removeSDFields(payload, sdMap).toMutableMap()
    println("[SDPAYLOAD][generateSDPayload] after removeSDFields sdPayloadKeys=${sdPayload.keys}")

    val digests = payload
        .filterKeys { key ->
            val cond = (sdMap[key]?.sd == true) || !sdMap[key]?.children.isNullOrEmpty()
            println("[SDPAYLOAD][generateSDPayload] filterKeys key=$key sd=${sdMap[key]?.sd} hasChildren=${!sdMap[key]?.children.isNullOrEmpty()} -> include=$cond")
            cond
        }
        .map { entry ->
            val key = entry.key
            val value = entry.value
            val hasChildren = !sdMap[key]?.children.isNullOrEmpty()
            val isObj = value is JsonObject
            println("[SDPAYLOAD][generateSDPayload] map key=$key isObj=$isObj hasChildren=$hasChildren sd=${sdMap[key]?.sd}")

            if (!isObj || !hasChildren) {
                // 整体可披露
                println("[SDPAYLOAD][generateSDPayload] digestSDClaim WHOLE key=$key")
                val d = digestSDClaim(
                    key = key,
                    value = value,
                    digests2disclosures = digests2disclosures
                )
                println("[SDPAYLOAD][generateSDPayload] digestSDClaim WHOLE key=$key -> digest=$d")
                d
            } else {
                // 子项可能分别披露
                val childMap = sdMap[key]!!.children!!
                println("[SDPAYLOAD][generateSDPayload] RECURSE key=$key childMapKeys=${childMap.keys}")
                val nestedSDPayload = generateSDPayload(
                    payload = value.jsonObject,
                    sdMap = childMap,
                    digests2disclosures = digests2disclosures
                )
                println("[SDPAYLOAD][generateSDPayload] RECURSE DONE key=$key nestedSDPayloadKeys=${nestedSDPayload.keys}")

                if (sdMap[key]?.sd == true) {
                    println("[SDPAYLOAD][generateSDPayload] digestSDClaim NESTED-WHOLE key=$key")
                    val d = digestSDClaim(
                        key = key,
                        value = nestedSDPayload,
                        digests2disclosures = digests2disclosures
                    )
                    println("[SDPAYLOAD][generateSDPayload] digestSDClaim NESTED-WHOLE key=$key -> digest=$d")
                    d
                } else {
                    sdPayload[key] = nestedSDPayload
                    println("[SDPAYLOAD][generateSDPayload] attach nested payload key=$key (no digest)")
                    null
                }
            }
        }
        .filterNotNull()
        .toSet()

    println("[SDPAYLOAD][generateSDPayload] digests.size=${digests.size} digests=$digests")

    if (digests.isNotEmpty()) {
        sdPayload[SDJwt.DIGESTS_KEY] = buildJsonArray {
            digests.forEach {
                println("[SDPAYLOAD][generateSDPayload] add digest=$it")
                add(it)
            }
            if (sdMap.decoyMode != DecoyMode.NONE && sdMap.decoys > 0) {
                val numDecoys = when (sdMap.decoyMode) {
                    // 注意：SecureRandom.nextInt 总是返回 0，这里用 nextDouble
                    DecoyMode.RANDOM -> SecureRandom.nextDouble(1.0, sdMap.decoys + 1.0).toInt()
                    DecoyMode.FIXED -> sdMap.decoys
                    else -> 0
                }
                println("[SDPAYLOAD][generateSDPayload] decoys mode=${sdMap.decoyMode} configured=${sdMap.decoys} -> numDecoys=$numDecoys")
                repeat(numDecoys) { idx ->
                    val fake = digest(generateSalt())
                    println("[SDPAYLOAD][generateSDPayload] add DECOY[$idx]=$fake")
                    add(fake)
                }
            }
        }
    }

    val result = JsonObject(sdPayload)
    println("[SDPAYLOAD][generateSDPayload] EXIT resultKeys=${result.keys}")
    return result
}

