const { parseYYYYMMDD, isWithinYears } = require("../utils/dateUtils");
const { getYearsFromParams } = require("../utils/paramUtils");
const { getVcFromRequest, getCredentialSubject } = require("../utils/vcUtils");

/**
 * Awards VC の表彰日（issuedAt）が指定年数以内であることを検証する
 */
const validateIssuedAtWithinYears = async (req, res) => {
  console.debug("*** validateIssuedAtWithinYears start ***");

  try {
    const years = getYearsFromParams(req.params.years);
    console.debug("years : ", years);

    const vc = getVcFromRequest(req);
    const credentialSubject = getCredentialSubject(vc);

    console.debug(
      "credentialSubject : ",
      JSON.stringify(credentialSubject, null, 2)
    );

    const issuedAtValue = credentialSubject.issuedAt;
    console.debug("issuedAtValue : ", issuedAtValue);

    const issuedAt = parseYYYYMMDD(issuedAtValue);
    const valid = isWithinYears(issuedAt, years);

    const result = {
      valid,
      message: valid
        ? `Awards VC issuedAt is within ${years} years.`
        : `Awards VC issuedAt is not within ${years} years.`,
      policy: `awards-issued-at-within-${years}-years`,
      checkedValue: issuedAtValue || null,
    };

    console.debug("result : ", result);

    return res.status(valid ? 200 : 400).json(result);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    return res.status(500).json({
      valid: false,
      message: "Internal server error.",
    });
  } finally {
    console.debug("*** validateIssuedAtWithinYears end ***");
  }
};

module.exports = {
  validateIssuedAtWithinYears,
};


const {
  parseYYYYMM,
  getCurrentYearMonth,
  isPeriodAtLeastYears,
} = require("../utils/dateUtils");
const { getYearsFromParams } = require("../utils/paramUtils");
const { getVcFromRequest, getCredentialSubject } = require("../utils/vcUtils");

/**
 * Career VC の在職期間（from ～ to）が指定年数以上であることを検証する
 */
const validateEmploymentPeriodAtLeastYears = async (req, res) => {
  console.debug("*** validateEmploymentPeriodAtLeastYears start ***");

  try {
    const years = getYearsFromParams(req.params.years);
    console.debug("years : ", years);

    const vc = getVcFromRequest(req);
    const credentialSubject = getCredentialSubject(vc);

    console.debug(
      "credentialSubject : ",
      JSON.stringify(credentialSubject, null, 2)
    );

    const fromValue = credentialSubject.from;
    const toValue = credentialSubject.to;

    console.debug("fromValue : ", fromValue);
    console.debug("toValue : ", toValue);

    const fromDate = parseYYYYMM(fromValue);
    const toDate = toValue ? parseYYYYMM(toValue) : getCurrentYearMonth();

    const valid = isPeriodAtLeastYears(fromDate, toDate, years);

    const result = {
      valid,
      message: valid
        ? `Career VC employment period is at least ${years} years.`
        : `Career VC employment period is not at least ${years} years.`,
      policy: `career-employment-period-at-least-${years}-years`,
      checkedValue: {
        from: fromValue || null,
        to: toValue || null,
      },
    };

    console.debug("result : ", result);

    return res.status(valid ? 200 : 400).json(result);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    return res.status(500).json({
      valid: false,
      message: "Internal server error.",
    });
  } finally {
    console.debug("*** validateEmploymentPeriodAtLeastYears end ***");
  }
};

module.exports = {
  validateEmploymentPeriodAtLeastYears,
};
