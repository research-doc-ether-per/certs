package id.walt.policies2.vc.policies

import com.nfeld.jsonpathkt.kotlinx.resolvePathAsStringOrNull
import id.walt.credentials.formats.DigitalCredential
import kotlinx.datetime.Clock
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
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
        fun toJson(): JsonElement =
            Json.encodeToJsonElement(this)
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
                ?: return if (allowNull) {
                    Result.success(
                        DateWithinPolicyResult(
                            value = null,
                            threshold = null,
                            valid = true,
                        ).toJson()
                    )
                } else {
                    Result.failure(
                        IllegalArgumentException(
                            "Could not resolve path in credential data: $path"
                        )
                    )
                }

        val credentialDate = try {
            parseDate(rawValue, format)
        } catch (e: Exception) {
            return Result.failure(
                IllegalArgumentException(
                    "Could not parse date '$rawValue' with format '$format'",
                    e,
                )
            )
        }

        val today =
            Clock.System
                .now()
                .toLocalDateTime(TimeZone.UTC)
                .date

        val threshold = try {
            calculateThreshold(
                today = today,
                value = value,
                unit = unit,
            )
        } catch (e: Exception) {
            return Result.failure(e)
        }

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
     * 対応 format:
     * - yyyy/MM/dd
     * - yyyy-MM-dd
     */
    private fun parseDate(
        value: String,
        format: String,
    ): LocalDate {
        return when (format) {
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

    /**
     * 指定された期間分だけ過去の日付を算出する。
     */
    private fun calculateThreshold(
        today: LocalDate,
        value: Int,
        unit: DateWithinUnit,
    ): LocalDate {
        return when (unit) {
            DateWithinUnit.YEARS -> {
                subtractYears(today, value)
            }

            DateWithinUnit.MONTHS -> {
                subtractMonths(today, value)
            }

            DateWithinUnit.DAYS -> {
                subtractDays(today, value)
            }
        }
    }

    private fun subtractYears(
        date: LocalDate,
        years: Int,
    ): LocalDate {
        val targetYear = date.year - years

        val day =
            minOf(
                date.dayOfMonth,
                daysInMonth(
                    targetYear,
                    date.monthNumber,
                ),
            )

        return LocalDate(
            year = targetYear,
            monthNumber = date.monthNumber,
            dayOfMonth = day,
        )
    }

    private fun subtractMonths(
        date: LocalDate,
        months: Int,
    ): LocalDate {
        val totalMonths =
            date.year * 12 +
                (date.monthNumber - 1) -
                months

        val targetYear = totalMonths / 12
        val targetMonth = totalMonths % 12 + 1

        val day =
            minOf(
                date.dayOfMonth,
                daysInMonth(
                    targetYear,
                    targetMonth,
                ),
            )

        return LocalDate(
            year = targetYear,
            monthNumber = targetMonth,
            dayOfMonth = day,
        )
    }

    private fun subtractDays(
        date: LocalDate,
        days: Int,
    ): LocalDate {
        var result = date

        repeat(days) {
            result = previousDay(result)
        }

        return result
    }

    private fun previousDay(
        date: LocalDate,
    ): LocalDate {
        if (date.dayOfMonth > 1) {
            return LocalDate(
                year = date.year,
                monthNumber = date.monthNumber,
                dayOfMonth = date.dayOfMonth - 1,
            )
        }

        return if (date.monthNumber > 1) {
            val previousMonth = date.monthNumber - 1

            LocalDate(
                year = date.year,
                monthNumber = previousMonth,
                dayOfMonth = daysInMonth(
                    date.year,
                    previousMonth,
                ),
            )
        } else {
            LocalDate(
                year = date.year - 1,
                monthNumber = 12,
                dayOfMonth = 31,
            )
        }
    }

    private fun daysInMonth(
        year: Int,
        month: Int,
    ): Int {
        return when (month) {
            1, 3, 5, 7, 8, 10, 12 -> 31
            4, 6, 9, 11 -> 30

            2 -> {
                if (isLeapYear(year)) {
                    29
                } else {
                    28
                }
            }

            else -> {
                throw IllegalArgumentException(
                    "Invalid month: $month"
                )
            }
        }
    }

    private fun isLeapYear(
        year: Int,
    ): Boolean {
        return year % 400 == 0 ||
            (year % 4 == 0 && year % 100 != 0)
    }
}
