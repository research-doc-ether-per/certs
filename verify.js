is WalletIdParam.Text -> {
    if (sql.contains("wallet = ?") &&
        stmt.connection.metaData.databaseProductName == "PostgreSQL"
    ) {
        stmt.setObject(1, java.util.UUID.fromString(param.value))
    } else {
        stmt.setString(1, param.value)
    }
}
