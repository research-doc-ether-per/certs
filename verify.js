
// DateWithinPolicy.kt
package id.walt.policies2.vc.policies

import com.nfeld.jsonpathkt.kotlinx.resolvePathAsStringOrNull
import id.walt.credentials.formats.DigitalCredential
import kotlinx.datetime.Clock
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.todayIn
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

@Serializable
@SerialName("date-within")
data class DateWithinPolicy(
    val path: String,
    val format: String,
    val value: Int,
    val unit: DateWithinUnit,
    @SerialName("allow_null")
    val allowNull: Boolean = false,
) : CredentialVerificationPolicy2() {

    override val id = "date-within"

    @Serializable
    enum class DateWithinUnit {
        @SerialName("years")
        YEARS,

        @SerialName("months")
        MONTHS,

        @SerialName("days")
        DAYS,
    }

    @Serializable
    @SerialName("DateWithinPolicyResult")
    data class DateWithinPolicyResult(
        val value: String?,
        val threshold: String?,
        val valid: Boolean,
    ) {
        fun toJson(): JsonElement = Json.encodeToJsonElement(this)
    }

    override suspend fun verify(
        credential: DigitalCredential,
        context: PolicyExecutionContext,
    ): Result<JsonElement> {

        if (value < 0) {
            return Result.failure(
                IllegalArgumentException(
                    "Date-within value must be greater than or equal to 0: $value"
                )
            )
        }

        val rawValue =
            credential.credentialData.resolvePathAsStringOrNull(path)
                ?: return when {
                    allowNull -> Result.success(
                        DateWithinPolicyResult(
                            value = null,
                            threshold = null,
                            valid = true,
                        ).toJson()
                    )

                    else -> Result.failure(
                        IllegalArgumentException(
                            "Could not resolve path in credential data: $path"
                        )
                    )
                }

        val credentialDate = runCatching {
            parseDate(rawValue, format)
        }.getOrElse { exception ->
            return Result.failure(
                IllegalArgumentException(
                    "Could not parse date '$rawValue' with format '$format'",
                    exception,
                )
            )
        }

        val today = Clock.System.todayIn(TimeZone.UTC)

        val threshold = when (unit) {
            DateWithinUnit.YEARS ->
                today.minus(DatePeriod(years = value))

            DateWithinUnit.MONTHS ->
                today.minus(DatePeriod(months = value))

            DateWithinUnit.DAYS ->
                today.minus(DatePeriod(days = value))
        }

        /*
         * date-within:
         *
         * threshold <= credentialDate <= today
         *
         * 未来日も無効とする。
         */
        val valid =
            credentialDate >= threshold &&
                credentialDate <= today

        if (!valid) {
            return Result.failure(
                IllegalArgumentException(
                    "Credential date is outside the allowed range. " +
                        "value=$rawValue, " +
                        "threshold=$threshold, " +
                        "today=$today"
                )
            )
        }

        return Result.success(
            DateWithinPolicyResult(
                value = rawValue,
                threshold = threshold.toString(),
                valid = true,
            ).toJson()
        )
    }

    /**
     * 指定された format に従って LocalDate に変換する。
     *
     * 現在対応している format:
     * - yyyy/MM/dd
     * - yyyy-MM-dd
     */
    private fun parseDate(
        value: String,
        format: String,
    ): LocalDate =
        when (format) {
            "yyyy/MM/dd" -> {
                val parts = value.split("/")

                require(parts.size == 3) {
                    "Expected yyyy/MM/dd format"
                }

                LocalDate(
                    year = parts[0].toInt(),
                    monthNumber = parts[1].toInt(),
                    dayOfMonth = parts[2].toInt(),
                )
            }

            "yyyy-MM-dd" -> {
                LocalDate.parse(value)
            }

            else -> {
                throw IllegalArgumentException(
                    "Unsupported date format: $format"
                )
            }
        }
}




 {
        "policy": "date-within",
        "path": "$.credentialSubject.issuedAt",
        "format": "yyyy/MM/dd",
        "value": 3,
        "unit": "years",
        "allow_null": false
      }
