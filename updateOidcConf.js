
import kotlinx.datetime.Clock
import kotlinx.datetime.toJavaInstant
import kotlinx.datetime.toKotlinInstant
import java.time.ZoneOffset
import java.time.ZonedDateTime
import kotlin.time.Duration.Companion.hours


  
  val now = Clock.System.now()
  val notBefore = now + 24.hours
  val notAfter = ZonedDateTime.ofInstant(notBefore.toJavaInstant(), ZoneOffset.UTC)
    .plusYears(1)
    .toInstant()
    .toKotlinInstant()

 
