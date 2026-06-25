suspend fun executeAllVerification(
        vpTokenContents: ParsedVpToken, session: Verification2Session,
        updateSessionCallback: suspend (session: Verification2Session, event: SessionEvent, block: Verification2Session.() -> Unit) -> Unit,
        failSessionCallback: suspend (session: Verification2Session, event: SessionEvent, updateSession: suspend (Verification2Session, SessionEvent, block: Verification2Session.() -> Unit) -> Unit) -> Unit,
        policyContext: PolicyExecutionContext = PolicyExecutionContext.Empty
    ) {
        // syntax sugar:
        suspend fun Verification2Session.updateSession(event: SessionEvent, block: Verification2Session.() -> Unit) =
            updateSessionCallback.invoke(this, event, block)

        suspend fun Verification2Session.failSession(event: SessionEvent) =
            failSessionCallback.invoke(this, event, updateSessionCallback)

        // --- Presentation validation ---

        val parsedPresentations = parseAllPresentations(vpTokenContents, session)

        session.updateSession(SessionEvent.parsed_presentation_available) {
            presentedPresentations = parsedPresentations.map { it.key.second.id to it.value }.toMap()
        }

        val presentationValidationResult = verifyAllPresentations(parsedPresentations, session)

        session.updateSession(SessionEvent.presentation_validation_available) {
            presentationValidationResults = presentationValidationResult
        }

        val anyError = presentationValidationResult.any { it.value.any { it.value.errors.isNotEmpty() } }

        if (anyError) {
            // 第1段階 VPポリシー検証失敗時の詳細を出力します
            println("==================================================")
            println("Verifier2 検証エンジン プレゼンテーション検証失敗")
            presentationValidationResult.forEach { (query, policyResults) ->
                println("クエリID $query")
                policyResults.forEach { (policyId, result) ->
                    println("  ポリシー $policyId 成功ステータス ${result.errors.isEmpty()} エラーリスト ${result.errors}")
                }
            }
            println("==================================================")

            // Handle validation failure
            log.warn { "One or more presentations in vp_token failed validation for session ${session.id}" }
            log.info { "Validation results for session ${session.id}:" }
            presentationValidationResult.forEach { (query, policyResults) ->
                log.info { "$query -> " }
                policyResults.forEach { (s, result) ->
                    log.info { "  --- $s: $result" }
                }
            }

            val firstError =
                presentationValidationResult.firstNotNullOfOrNull { it.value.firstNotNullOfOrNull { it.value.errors.firstOrNull() } }
            log.warn { "First error: $firstError" }

            val failedPoliciesMap = presentationValidationResult
                .mapValues { (_, byPolicy) -> byPolicy.filterValues { it.errors.isNotEmpty() } }
                .filterValues { it.isNotEmpty() }

            session.updateSession(SessionEvent.presentation_validation_available) {
                failure = SessionFailure.PresentationValidation(
                    reason = firstError?.message?.let { "Presentation validation failed: $it" }
                        ?: "One or more presentations in vp_token failed validation",
                    failedPolicies = failedPoliciesMap,
                )
            }

            session.failSession(SessionEvent.presentation_validation_failed)

            val failedPoliciesNames = presentationValidationResult.flatMap { (queryId, policyResults) ->
                policyResults.filter { it.value.errors.isNotEmpty() }
                    .map { (policyId, _) -> "$queryId/$policyId" }
            }
            throw PresentationRejectionException(
                "Presentation validation failed. Failed VP policies: ${failedPoliciesNames.joinToString()}"
            )
        }

        val allSuccessfullyValidatedAndProcessedData = parsedPresentations.map {
            it.key.second.id to when (val presentation = it.value) {
                is JwtVcJsonPresentation -> presentation.credentials ?: emptyList()
                is DcSdJwtPresentation -> listOf(presentation.credential)
                is MsoMdocPresentation -> listOf(presentation.mdoc)
                is LdpVcPresentation -> throw NotImplementedError()
            }
        }.toMap()

        session.updateSession(SessionEvent.validated_credentials_available) {
            presentedCredentials = allSuccessfullyValidatedAndProcessedData
        }

        // --- DCQL validation ---

        // Check if the set of validated presentations satisfies the overall DCQL Query
        // (e.g., credential_sets, all *required* CredentialQuery IDs are present in allSuccessfullyValidatedAndProcessedData)
        val dcqlFulfilled = session.authorizationRequest.dcqlQuery?.let { dcqlQuery ->
            DcqlFulfillmentChecker.checkOverallDcqlFulfillment(
                dcqlQuery = dcqlQuery,
                successfullyValidatedQueryIds = allSuccessfullyValidatedAndProcessedData.keys // set of query IDs for which we have valid presentations
            )
        }
        val dcqlFailure = dcqlFulfilled?.exceptionOrNull() as? DcqlFulfillmentChecker.DcqlFulfillmentException
        if (dcqlFailure != null) {
            // 第2段階 DCQL要件を満たしていない場合のエラーを出力します
            println("==================================================")
            println("Verifier2 検証エンジン DCQL要件未充足エラー")
            println("エラーメッセージ ${dcqlFailure.message}")
            println("エラー詳細 ${dcqlFailure.details}")
            println("==================================================")

            log.error { "The set of validated presentations does not fulfill all DCQL requirements for session ${session.id}, reported error is: ${dcqlFailure.message}" }

            session.updateSession(SessionEvent.validated_credentials_available) {
                failure = SessionFailure.DcqlFulfillment(
                    reason = dcqlFailure.message,
                    failure = dcqlFailure.details,
                )
            }

            session.failSession(SessionEvent.dcql_fulfillment_check_failed)

            throw PresentationRejectionException(
                "The set of validated presentations does not fulfill all DCQL requirements. DCQL errors are: ${dcqlFulfilled.exceptionOrNull()?.message}",
                dcqlFulfilled.exceptionOrNull()!!
            )
        }

        session.updateSession(SessionEvent.presentation_fulfils_dcql_query) {

        }

        // --- Credential verification ---

        val credentialPolicyResults = Verifier2SessionCredentialPolicyValidation.validateCredentialPolicies(
            session.policies,
            allSuccessfullyValidatedAndProcessedData,
            policyContext
        )

        val verificationSessionPolicyResults = Verifier2PolicyResults(
            vpPolicies = presentationValidationResult,
            vcPolicies = credentialPolicyResults.vcPolicies,
            specificVcPolicies = credentialPolicyResults.specificVcPolicies,
        )

        val vcPolicyViolations =
            credentialPolicyResults.vcPolicies.filter { !it.success } +
                    credentialPolicyResults.specificVcPolicies.values.flatten().filter { !it.success }

        session.updateSession(SessionEvent.credential_policy_results_available) {
            this.policyResults = verificationSessionPolicyResults
            this.status = when {
                verificationSessionPolicyResults.overallSuccess -> Verification2Session.VerificationSessionStatus.SUCCESSFUL
                else -> Verification2Session.VerificationSessionStatus.FAILED
            }
            if (!verificationSessionPolicyResults.overallSuccess) {
                // Invariant: overallSuccess=false implies at least one credential policy failure
                // in the same lists used to compute the overall result.
                failure = SessionFailure.VcPolicyViolations(
                    reason = "${vcPolicyViolations.size} credential policy violation(s)",
                    violations = vcPolicyViolations,
                )
            }
        }

        if (!verificationSessionPolicyResults.overallSuccess) {
            val failedVcPolicies = credentialPolicyResults.vcPolicies
                .filter { !it.success }
                .map { it.policy.id }
            val failedSpecificVcPolicies = credentialPolicyResults.specificVcPolicies
                .flatMap { (queryId, results) -> results.filter { !it.success }.map { "$queryId/${it.policy.id}" } }
            val allFailed = (failedVcPolicies + failedSpecificVcPolicies).distinct()

            // 第3段階 VCの個別ポリシー（署名者信頼、失効状態、要求クレイムなど）検証失敗時の詳細を出力します
            println("==================================================")
            println("Verifier2 検証エンジン 資格情報ポリシー検証失敗")
            println("失敗した共通ポリシー $failedVcPolicies")
            println("失敗した個別資格情報ポリシー $failedSpecificVcPolicies")
            println("==================================================")

            throw PresentationRejectionException(
                "Credential policy verification failed. Failed VC policies: ${allFailed.joinToString()}"
            )
        }

        println("==================================================")
        println("Verifier2 検証エンジン すべての検証ステップを正常に通過しました")
        println("==================================================")
    }
