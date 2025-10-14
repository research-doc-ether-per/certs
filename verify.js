
import id.walt.policies.policies.status.Values

private val allowedSubjectTypes = setOf(
    Values.BITSTRING_STATUS_LIST,
    Values.STATUS_LIST_2021,
    Values.REVOCATION_LIST_2020
)


override fun customValidations(statusList: W3CStatusContent, attribute: W3CStatusPolicyAttribute) {
    val t = statusList.type // credentialSubject.type
    require(t in allowedSubjectTypes) {
        "Unsupported status list type: $t (expected one of $allowedSubjectTypes)"
    }
    require(statusList.purpose == attribute.purpose) {
        "statusPurpose mismatch: ${statusList.purpose} != ${attribute.purpose}"
    }
}
