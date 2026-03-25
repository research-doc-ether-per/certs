override fun getSession(id: String): PresentationSession {
    println("==== getSession DEBUG ====")
    println("requested id = $id")

    println("presentationSessions.size = ${presentationSessions.size}")
    println("presentationSessions.keys = ${presentationSessions.keys}")

    val session = presentationSessions[id]

    if (session == null) {
        println("❌ session NOT FOUND")
    } else {
        println("✅ session FOUND")
        println("session.id = ${session.id}")
        println("nonce = ${session.authorizationRequest?.nonce}")
        println("responseMode = ${session.authorizationRequest?.responseMode}")
    }

    return session
        ?: throw NotFoundException("Id parameter $id doesn't refer to an existing session, or session expired")
}
