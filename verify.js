package id.walt.policies2.vc.policies

import com.nfeld.jsonpathkt.kotlinx.resolvePathAsStringOrNull
import id.walt.credentials.formats.DigitalCredential
import kotlin.time.Clock
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

    /**
     * 日付範囲の単位
     */
    @Serializable
    enum class DateWithinUnit {

        @SerialName("years")
        YEARS,

        @SerialName("months")
        MONTHS,

        @SerialName("days")
        DAYS,
    }

    /**
     * Policy 実行結果
     */
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

    /**
     * Credential の日付が指定された期間内であるか検証する。
     *
     * 例:
     *
     * path   = $.credentialSubject.issuedAt
     * format = yyyy/MM/dd
     * value  = 3
     * unit   = years
     *
     * → issuedAt が現在日付から3年以内であることを検証する。
     */
    override suspend fun verify(
        credential: DigitalCredential,
        context: PolicyExecutionContext,
    ): Result<JsonElement> {

        /*
         * value のチェック
         */
        if (value < 0) {
            return Result.failure(
                IllegalArgumentException(
                    "Date-within value must be greater than or equal to 0: $value"
                )
            )
        }

        /*
         * Credential から対象の日付を取得
         */
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

        /*
         * Credential の日付を LocalDate に変換
         */
        val credentialDate =
            try {

                parseDate(
                    value = rawValue,
                    format = format,
                )

            } catch (e: Exception) {

                return Result.failure(
                    IllegalArgumentException(
                        "Could not parse date '$rawValue' with format '$format'",
                        e,
                    )
                )
            }

        /*
         * 現在日付を取得
         *
         * kotlin.time.Clock を使用すること。
         */
        val today =
            Clock.System
                .now()
                .toLocalDateTime(TimeZone.UTC)
                .date

        /*
         * 検証可能な最小日付を算出
         */
        val threshold =
            try {

                calculateThreshold(
                    today = today,
                    value = value,
                    unit = unit,
                )

            } catch (e: Exception) {

                return Result.failure(e)
            }

        /*
         * date-within の判定
         *
         * threshold <= credentialDate <= today
         *
         * 未来日付は NG とする。
         */
        val valid =
            credentialDate >= threshold &&
                credentialDate <= today

        /*
         * 範囲外の場合
         */
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

        /*
         * 検証成功
         */
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
     * 対応形式:
     *
     * yyyy/MM/dd
     * yyyy-MM-dd
     */
    private fun parseDate(
        value: String,
        format: String,
    ): LocalDate {

        return when (format) {

            /*
             * 例:
             * 2026/10/01
             */
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

            /*
             * 例:
             * 2026-10-01
             */
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
     * 現在日付から指定期間を減算する。
     */
    private fun calculateThreshold(
        today: LocalDate,
        value: Int,
        unit: DateWithinUnit,
    ): LocalDate {

        return when (unit) {

            DateWithinUnit.YEARS -> {
                subtractYears(
                    date = today,
                    years = value,
                )
            }

            DateWithinUnit.MONTHS -> {
                subtractMonths(
                    date = today,
                    months = value,
                )
            }

            DateWithinUnit.DAYS -> {
                subtractDays(
                    date = today,
                    days = value,
                )
            }
        }
    }

    /**
     * 年を減算する。
     *
     * 例:
     *
     * 2024/02/29 - 1 year
     * ↓
     * 2023/02/28
     */
    private fun subtractYears(
        date: LocalDate,
        years: Int,
    ): LocalDate {

        val targetYear =
            date.year - years

        val targetDay =
            minOf(
                date.dayOfMonth,
                daysInMonth(
                    year = targetYear,
                    month = date.monthNumber,
                ),
            )

        return LocalDate(
            year = targetYear,
            monthNumber = date.monthNumber,
            dayOfMonth = targetDay,
        )
    }

    /**
     * 月を減算する。
     */
    private fun subtractMonths(
        date: LocalDate,
        months: Int,
    ): LocalDate {

        val totalMonths =
            date.year * 12 +
                (date.monthNumber - 1) -
                months

        val targetYear =
            totalMonths / 12

        val targetMonth =
            totalMonths % 12 + 1

        val targetDay =
            minOf(
                date.dayOfMonth,
                daysInMonth(
                    year = targetYear,
                    month = targetMonth,
                ),
            )

        return LocalDate(
            year = targetYear,
            monthNumber = targetMonth,
            dayOfMonth = targetDay,
        )
    }

    /**
     * 日を減算する。
     */
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

    /**
     * 1日前の日付を取得する。
     */
    private fun previousDay(
        date: LocalDate,
    ): LocalDate {

        /*
         * 同じ月の前日
         */
        if (date.dayOfMonth > 1) {

            return LocalDate(
                year = date.year,
                monthNumber = date.monthNumber,
                dayOfMonth = date.dayOfMonth - 1,
            )
        }

        /*
         * 前月
         */
        if (date.monthNumber > 1) {

            val previousMonth =
                date.monthNumber - 1

            return LocalDate(
                year = date.year,
                monthNumber = previousMonth,
                dayOfMonth = daysInMonth(
                    year = date.year,
                    month = previousMonth,
                ),
            )
        }

        /*
         * 前年12月
         */
        return LocalDate(
            year = date.year - 1,
            monthNumber = 12,
            dayOfMonth = 31,
        )
    }

    /**
     * 指定された年月の日数を取得する。
     */
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

    /**
     * 閏年判定
     */
    private fun isLeapYear(
        year: Int,
    ): Boolean {

        return year % 400 == 0 ||
            (
                year % 4 == 0 &&
                    year % 100 != 0
                )
    }
}


# Credential 発行手順

## 4.1.2 Credential 発行

1. Credential 発行前に、以下の設定を行います。

   - `credential-issuer-metadata.conf`
     - 発行対象となる Credential Configuration を定義します。
   - `issuer2-profiles.conf`
     - Credential Profile を定義し、`credentialConfigurationId`、`issuerKey`、`issuerDid`、`credentialData`、`mapping`、`selectiveDisclosure` などの発行設定を指定します。

2. 認可コードフロー用の `wallet-id-issuer-api` Client の設定に問題がないか確認してください。

   - Keycloak 情報の設定

     ```text
     ~/workspace/cloudcredentialservice/libs/waltid/waltid-identity-1.0.0/docker-compose/issuer-api2/config/authentication-service.conf
     ```

   - `wallet-id-issuer-api` Client の Callback URL を以下のように設定してください。

     ```text
     http://10.0.2.15:7005/openid4vci/external/oauth/callback
     ```

   - `vc-issuer` Realm 内で、対象ユーザーが正常に作成されていることを確認してください。

3. VC Status（VC の有効・失効管理）機能も確認対象に含めるため、`vc-registry-api` の設定および起動も必要です。

   - Keycloak 情報の設定

     ```text
     ~/workspace/cloudcredentialservice/samples/v1.0.0/config/vc-status.json
     ~/workspace/cloudcredentialservice/libs/waltid/waltid-identity-1.0.0/docker-compose/issuer-api2/config/vc-status.conf
     ~/workspace/cloudcredentialservice/services/vc-registry-api/docker-compose.yaml
     ~/workspace/cloudcredentialservice/services/vc-registry-api/.env
     ```

   - Issuer 情報の設定

     ```text
     ~/workspace/cloudcredentialservice/services/vc-registry-api/src/config/index.ts
     ```

   - API の起動

     ```bash
     cd ~/workspace/cloudcredentialservice/services/vc-registry-api/

     # DB の作成や起動（初回のみ実施）
     ./db_manager.sh start

     # サーバー起動
     npm run dev
     ```

4. `~/workspace/cloudcredentialservice/samples/v1.0.0/src/openid4vci-pre-authorized-credential-issue.js` にて、`vct#integrity` の設定に問題がないか確認してください。

   参考：

   ```text
   ../v1.0.0_custom-vct-metadata-server/README.md
   ```

5. 今回の動作確認では、以下の Credential を発行対象とします。

   - `Awards_jwt_vc_json`
   - `Awards_vc+sd-jwt`
   - `Career_jwt_vc_json`
   - `Career_vc+sd-jwt`
   - `Qualification_jwt_vc_json`

6. Credential 発行は、事前認可コードフローと認可コードフローについて、それぞれ以下の 2 方式で確認します。

   - 一括処理 API  
     Credential 取得に必要な複数の処理を Wallet2 内部でまとめて実行します。

   - 個別処理 API（Step-by-Step）  
     各処理を個別 API に分けて実行します。
