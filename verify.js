curl -v \
  -X POST \
  http://localhost:7006/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'


package id.walt.wallet2

import id.walt.commons.ServiceConfiguration
import id.walt.commons.ServiceInitialization
import id.walt.commons.ServiceMain
import id.walt.commons.config.ConfigManager
import id.walt.commons.featureflag.CommonsFeatureCatalog
import id.walt.commons.featureflag.FeatureManager
import id.walt.commons.web.WebService
import id.walt.commons.web.modules.AuthenticationServiceModule
import id.walt.did.dids.DidService
import id.walt.ktorauthnz.auth.ktorAuthnz
import id.walt.wallet2.auth.configureWallet2Auth
import id.walt.wallet2.auth.registerWallet2AuthRoutes
import id.walt.wallet2.config.registerWallet2ConfigDecoders
import id.walt.wallet2.persistence.Wallet2PersistenceConfig
import id.walt.wallet2.persistence.initWallet2Database
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.callid.*
import io.ktor.server.plugins.calllogging.*
import io.ktor.server.plugins.compression.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.forwardedheaders.*
import io.ktor.server.request.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json
import org.slf4j.event.Level

suspend fun main(args: Array<String>) {
    registerWallet2ConfigDecoders()

    ServiceMain(
        ServiceConfiguration(
            "wallet",
            version = BuildConfig.VERSION
        ),
        ServiceInitialization(
            features = OSSWallet2FeatureCatalog,

            // AuthenticationServiceModule の初期化前に
            // Wallet2 で使用する Ktor Authentication Provider を登録する
            featureAmendments = mapOf(
                CommonsFeatureCatalog.authenticationServiceFeature to suspend {
                    AuthenticationServiceModule
                        .AuthenticationServiceConfig
                        .customAuthentication = {
                            ktorAuthnz("ktor-authnz") { }
                        }
                }
            ),

            init = {
                DidService.minimalInit()

                // Persistence が有効な場合、Wallet2 のデータベースを初期化する
                if (
                    FeatureManager.isFeatureEnabled(
                        OSSWallet2FeatureCatalog.persistenceFeature
                    )
                ) {
                    val config =
                        ConfigManager.getConfig<Wallet2PersistenceConfig>()

                    val db =
                        initWallet2Database(config)

                    OSSWallet2Service.configurePersistence(db)
                }
            },

            run = WebService {
                val authConfig =
                    if (
                        FeatureManager.isFeatureEnabled(
                            OSSWallet2FeatureCatalog.authFeature
                        )
                    ) {
                        configureWallet2Auth()
                    } else {
                        null
                    }

                wallet2Module(
                    withPlugins = true,
                    authConfig = authConfig
                )
            }.run()
        )
    ).main(args)
}

/**
 * Wallet2 の Application Module
 */
fun Application.wallet2Module(
    withPlugins: Boolean = true,
    authConfig: OSSWallet2AuthConfig? = null
) {
    if (withPlugins) {
        configurePlugins()
    }

    wallet2Api(authConfig)
}

/**
 * Application Plugin の設定
 */
fun Application.configurePlugins() {
    configureHTTP()
    configureSerialization()
    configureMonitoring()
}

/**
 * HTTP / CORS の設定
 */
fun Application.configureHTTP() {
    install(Compression)

    install(CORS) {
        allowHeaders { true }
        allowMethod(HttpMethod.Options)
        allowNonSimpleContentTypes = true
        allowCredentials = true
        allowOrigins { true }
    }

    install(ForwardedHeaders)
    install(XForwardedHeaders)
}

/**
 * JSON のシリアライズ・デシリアライズ設定
 *
 * ContentNegotiation を有効化し、
 * JSON リクエストを RegisterRequest などのオブジェクトへ
 * デシリアライズできるようにする。
 */
fun Application.configureSerialization() {
    install(ContentNegotiation) {
        json(
            Json {
                ignoreUnknownKeys = true
                isLenient = true
            }
        )
    }
}

/**
 * Logging / CallId の設定
 */
fun Application.configureMonitoring() {
    install(CallLogging) {
        level = Level.INFO

        filter { call ->
            call.request.path().startsWith("/")
        }

        callIdMdc("call-id")
    }

    install(CallId) {
        header(HttpHeaders.XRequestId)

        verify { callId: String ->
            callId.isNotEmpty()
        }
    }
}

/**
 * Wallet2 API Route の登録
 */
fun Application.wallet2Api(
    authConfig: OSSWallet2AuthConfig? = null
) {
    routing {

        // auth feature が有効な場合、Wallet2 の認証関連 Route を登録する
        if (
            FeatureManager.isFeatureEnabled(
                OSSWallet2FeatureCatalog.authFeature
            )
        ) {
            requireNotNull(authConfig) {
                "No auth config is provided for auth feature!"
            }

            registerWallet2AuthRoutes(
                tokenExpiry = authConfig.tokenExpiry,
                walletResolver = OSSWallet2Service.resolver,
            )
        }

        registerTransactionDataProfilesRoute()

        OSSWallet2Service.run {
            registerRoutes()
        }
    }
}
