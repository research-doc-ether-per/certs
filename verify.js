  val statusListAny: Any = if (isJson) {
            logger.debug { "Detected JSON status list, parsing as W3C Bitstring JSON…" }

            val json = Json { ignoreUnknownKeys = true; isLenient = true }
            val payload = json.parseToJsonElement(statusListContent).jsonObject

            // BitstringStatusListCredential: 顶层有 credentialSubject
            val credentialSubject = payload["credentialSubject"]?.jsonObject
                ?: throw StatusRetrievalError("Missing 'credentialSubject' in status list JSON")

            // 反序列化为 W3CStatusContent（与 Walt.id 的模型对齐）
            json.decodeFromJsonElement(
                id.walt.policies.policies.status.model.W3CStatusContent.serializer(),
                credentialSubject
            )
        } else {
            logger.debug { "Detected JWT status list, parsing via reader…" }
            reader.read(statusListContent)
                .getOrElse { throw StatusRetrievalError(it.message ?: "Status credential parsing error") }
        }

        // 5) 将 Any 转为 K（在本基类中做一次受控断言）
        @Suppress("UNCHECKED_CAST")
        val statusList: K = statusListAny as K
