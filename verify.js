
const argon2 = require("argon2");

// パスワードハッシュの検証
const verifyLegacyPassword = async (password, passwordHash) => {
  console.debug("*** verifyLegacyPassword start ***");

  try {
    if (
      typeof password !== "string" ||
      !password ||
      typeof passwordHash !== "string" ||
      !passwordHash
    ) {
      return false;
    }

    if (!passwordHash.startsWith("$argon2i$")) {
      throw new Error("Unsupported legacy password hash format");
    }

    const result = await argon2.verify(
      passwordHash,
      Buffer.from(password, "utf8")
    );

    console.debug("result : ", {
      verified: result,
    });

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** verifyLegacyPassword end ***");
  }
};



const account = await getAccountByEmail(email);

if (!account || !account.password_hash) {
  throw new Error("Invalid credentials");
}

const verified = await verifyLegacyPassword(
  password,
  account.password_hash
);

if (!verified) {
  throw new Error("Invalid credentials");
}

const result = await createAuthResult(account);

return result;
