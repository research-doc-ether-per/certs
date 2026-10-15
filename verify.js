const getCredentialStringValue = async (type) => {
  console.debug("*** getCredentialStringValue start ***");

  try {
    let result;

    if (type === "Awards") {
      result = "Excellent Performance";
    } else if (type === "Career") {
      result = "Engineering";
    } else if (type === "Qualifications") {
      result = "Advanced";
    } else {
      throw new Error(`Unsupported credential type: ${type}`);
    }

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getCredentialStringValue end ***");
  }
};

const getCredentialJsonValue = async (type) => {
  console.debug("*** getCredentialJsonValue start ***");

  try {
    let result;

    if (type === "Awards") {
      result = {
        category: "Performance",
        year: 2026,
        rank: "Gold",
      };
    } else if (type === "Career") {
      result = {
        employmentType: "Full-time",
        yearsOfExperience: 7,
      };
    } else if (type === "Qualifications") {
      result = {
        issuerName: "Example Certification Authority",
        issuedYear: 2024,
        valid: true,
      };
    } else {
      throw new Error(`Unsupported credential type: ${type}`);
    }

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getCredentialJsonValue end ***");
  }
};

const getCredentialString = async (req, res) => {
  console.debug("*** getCredentialString start ***");

  try {
    console.debug("method : ", req.method);
    console.debug("url : ", req.originalUrl);
    console.debug("params : ", req.params);
    console.debug("query : ", req.query);
    console.debug("headers : ", req.headers);

    const type = req.params.type;

    const result = await getCredentialStringValue(type);

    return res.type("text/plain").send(result);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    return res
      .status(400)
      .type("text/plain")
      .send(error.message);
  } finally {
    console.debug("*** getCredentialString end ***");
  }
};

const getCredentialJson = async (req, res) => {
  console.debug("*** getCredentialJson start ***");

  try {
    console.debug("method : ", req.method);
    console.debug("url : ", req.originalUrl);
    console.debug("params : ", req.params);
    console.debug("query : ", req.query);
    console.debug("headers : ", req.headers);

    const type = req.params.type;

    const result = await getCredentialJsonValue(type);

    return res.json(result);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    return res.status(400).json({
      error: error.message,
    });
  } finally {
    console.debug("*** getCredentialJson end ***");
  }
};

module.exports = {
  getCredentialString,
  getCredentialJson,
};


app.get(
  "/webhook/:type/string",
  credentialService.getCredentialString
);

app.get(
  "/webhook/:type/json",
  credentialService.getCredentialJson
);

