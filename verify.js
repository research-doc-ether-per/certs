suspend fun matchCredentialsForPresentationDefinition(
    walletId: Uuid,
    presentationDefinition: PresentationDefinition
): List<WalletCredential> {

    println("========== START matchCredentials ==========")
    println("walletId = $walletId")
    println("presentationDefinition = ${presentationDefinition.toJSON()}")

    val pd = Json.decodeFromJsonElement<id.walt.definitionparser.PresentationDefinition>(
        presentationDefinition.toJSON()
    )

    println("parsed PD inputDescriptors size = ${pd.inputDescriptors.size}")

    val allCreds = credentialService.list(walletId, CredentialFilterObject.default)
    println("total credentials = ${allCreds.size}")

    val matches = allCreds.filter { cred ->

        println("------ CHECK CREDENTIAL ------")
        println("cred.id = ${cred.id}")
        println("cred.format = ${cred.format}")

        val fullDoc = WalletCredential.parseFullDocument(
            cred.document,
            cred.disclosures,
            cred.id,
            cred.format
        )

        println("fullDoc = ${fullDoc != null}")

        if (fullDoc == null) {
            println("fullDoc is null, skip")
            return@filter false
        }

        val matched = pd.inputDescriptors.any { inputDesc ->

            println(">>> CHECK inputDescriptor id = ${inputDesc.id}")

            val result = PresentationDefinitionParser
                .matchCredentialsForInputDescriptor(flowOf(fullDoc), inputDesc)
                .toList()

            println("match result size = ${result.size}")

            result.isNotEmpty()
        }

        println("FINAL match for cred ${cred.id} = $matched")

        matched
    }

    println("========== END matchCredentials ==========")
    println("matched count = ${matches.size}")

    return matches
}
