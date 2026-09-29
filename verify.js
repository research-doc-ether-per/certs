/**
 * Career 用 Type Metadata を作成する。
 */
const createCareerMetadata = async (baseUrl) => {
  console.debug("*** createCareerMetadata start ***");

  try {
    const result = {
      vct: `${baseUrl}/vct/career`,
      name: "Career Credential",
      description: "Type metadata for Career VC used in vct-integrity test",
      schema: {
        type: "object",
        properties: {
          credentialSubject: {
            type: "object",
            properties: {
              certName: {
                type: "string",
                description: "Certificate name"
              },
              certExplanation: {
                type: "string",
                description: "Certificate explanation"
              },
              image: {
                type: ["string", "null"],
                description: "Certificate image"
              },
              organization: {
                type: "string",
                description: "Organization name"
              },
              type: {
                type: "string",
                description: "Career type"
              },
              category: {
                type: "string",
                description: "Career category"
              },
              position: {
                type: "string",
                description: "Position"
              },
              from: {
                type: "string",
                description: "Employment start month. Format: YYYY/MM"
              },
              to: {
                type: "string",
                description: "Employment end month. Format: YYYY/MM"
              }
            },
            required: [
              "certName",
              "certExplanation",
              "organization",
              "type",
              "category",
              "position",
              "from",
              "to"
            ]
          }
        },
        required: ["credentialSubject"]
      }
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** createCareerMetadata end ***");
  }
};


/**
 * Awards 用 Type Metadata を作成する。
 */
const createAwardsMetadata = async (baseUrl) => {
  console.debug("*** createAwardsMetadata start ***");

  try {
    const result = {
      vct: `${baseUrl}/vct/awards`,
      name: "Awards Credential",
      description: "Type metadata for Awards VC used in vct-integrity test",
      schema: {
        type: "object",
        properties: {
          credentialSubject: {
            type: "object",
            properties: {
              certName: {
                type: "string",
                description: "Certificate name"
              },
              certExplanation: {
                type: "string",
                description: "Certificate explanation"
              },
              image: {
                type: ["string", "null"],
                description: "Certificate image"
              },
              organization: {
                type: "string",
                description: "Organization name"
              },
              issuedAt: {
                type: "string",
                description: "Award date. Format: YYYY/MM/DD"
              }
            },
            required: [
              "certName",
              "certExplanation",
              "organization",
              "issuedAt"
            ]
          }
        },
        required: ["credentialSubject"]
      }
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** createAwardsMetadata end ***");
  }
};
