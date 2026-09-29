/**
 * Awards VC の日付（YYYY/MM/DD）を Date 型に変換する。
 */
const parseDate = (value) => {
  console.debug("*** parseDate start ***");

  try {
    if (!value) return null;

    if (typeof value === "number") {
      return new Date(value * 1000);
    }

    if (typeof value !== "string") {
      return null;
    }

    const trimmedValue = value.trim();
    const yyyymmdd = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(trimmedValue);

    if (yyyymmdd) {
      const year = Number(yyyymmdd[1]);
      const month = Number(yyyymmdd[2]);
      const day = Number(yyyymmdd[3]);
      const result = new Date(year, month - 1, day);

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        return null;
      }

      return result;
    }

    const result = new Date(trimmedValue);
    return Number.isNaN(result.getTime()) ? null : result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** parseDate end ***");
  }
};

/**
 * Career VC の年月（YYYY/MM）を year / month に変換する。
 */
const parseYearMonth = (value) => {
  console.debug("*** parseYearMonth start ***");

  try {
    if (!value || typeof value !== "string") return null;

    const trimmedValue = value.trim();
    const yyyymm = /^(\d{4})\/(\d{2})$/.exec(trimmedValue);

    if (!yyyymm) return null;

    const year = Number(yyyymm[1]);
    const month = Number(yyyymm[2]);

    if (month < 1 || month > 12) return null;

    const result = { year, month };
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** parseYearMonth end ***");
  }
};

/**
 * year / month を YYYY/MM 形式に変換する。
 */
const formatYearMonth = (yearMonth) => {
  console.debug("*** formatYearMonth start ***");

  try {
    if (!yearMonth) return null;

    const result = `${yearMonth.year}/${String(yearMonth.month).padStart(2, "0")}`;
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** formatYearMonth end ***");
  }
};

/**
 * 対象日が現在から指定年数以内であるかを判定する。
 */
const isWithinYears = (targetDate, years) => {
  console.debug("*** isWithinYears start ***");

  try {
    if (!targetDate) return false;

    const now = new Date();
    const threshold = new Date(now);
    threshold.setFullYear(now.getFullYear() - years);

    const result = targetDate >= threshold && targetDate <= now;
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** isWithinYears end ***");
  }
};

/**
 * from ～ to の年月が指定年数以上であるかを判定する。
 *
 * Career VC の from / to は YYYY/MM 形式のため、月単位で判定する。
 * 例：2020/04 ～ 2023/03 は 36 か月として扱う。
 */
const isYearMonthPeriodAtLeastYears = (fromYearMonth, toYearMonth, years) => {
  console.debug("*** isYearMonthPeriodAtLeastYears start ***");

  try {
    if (!fromYearMonth || !toYearMonth) return false;

    const months =
      (toYearMonth.year - fromYearMonth.year) * 12 +
      (toYearMonth.month - fromYearMonth.month) +
      1;

    const result = months >= years * 12;
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** isYearMonthPeriodAtLeastYears end ***");
  }
};

module.exports = {
  parseDate,
  parseYearMonth,
  formatYearMonth,
  isWithinYears,
  isYearMonthPeriodAtLeastYears,
};




const { parseDate, isWithinYears } = require("../utils/dateUtils");
const { getYearsFromParams } = require("../utils/paramUtils");
const {
  getVcFromRequest,
  getCredentialSubject,
  buildResult,
  sendPolicyResult,
} = require("../utils/vcUtils");

/**
 * Awards VC から表彰日を取得する。
 *
 * 現時点では issuedAt を主な確認対象とする。
 * VC のデータ構造によって項目名が異なる可能性があるため、
 * awardedAt / awardDate / issuanceDate / iat も候補として確認する。
 */
const getAwardsIssuedAt = async (vc) => {
  console.debug("*** getAwardsIssuedAt start ***");

  try {
    const credentialSubject = getCredentialSubject(vc);

    const result =
      parseDate(credentialSubject.issuedAt) ||
      parseDate(credentialSubject.awardedAt) ||
      parseDate(credentialSubject.awardDate) ||
      parseDate(vc.issuanceDate) ||
      parseDate(vc.issuedAt) ||
      parseDate(vc.iat);

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getAwardsIssuedAt end ***");
  }
};

/**
 * Awards VC の表彰日が指定年数以内であるかを検証する。
 */
const validateIssuedAtWithinYears = async (req, res) => {
  console.debug("*** validateIssuedAtWithinYears start ***");

  try {
    const years = await getYearsFromParams(req);
    const vc = getVcFromRequest(req);
    const issuedAt = await getAwardsIssuedAt(vc);
    const valid = isWithinYears(issuedAt, years);

    const result = buildResult(
      valid,
      valid
        ? `Awards VC issuedAt is within ${years} years.`
        : `Awards VC issuedAt is not within ${years} years.`,
      {
        policy: `awards-issued-at-within-${years}-years`,
        checkedValue: issuedAt ? issuedAt.toISOString() : null,
      }
    );

    console.debug("result : ", result);

    return sendPolicyResult(res, result);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    if (error.message === "Invalid years parameter.") {
      return res.status(400).json({
        valid: false,
        message: "Invalid years parameter.",
      });
    }

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
  parseYearMonth,
  formatYearMonth,
  isYearMonthPeriodAtLeastYears,
} = require("../utils/dateUtils");
const { getYearsFromParams } = require("../utils/paramUtils");
const {
  getVcFromRequest,
  getCredentialSubject,
  buildResult,
  sendPolicyResult,
} = require("../utils/vcUtils");

/**
 * Career VC から在職期間を取得する。
 *
 * from：在職開始年月（YYYY/MM）
 * to：在職終了年月（YYYY/MM）
 *
 * to が存在しない場合は、現在も在職中として現在年月を使用する。
 */
const getEmploymentPeriod = async (vc) => {
  console.debug("*** getEmploymentPeriod start ***");

  try {
    const credentialSubject = getCredentialSubject(vc);
    const now = new Date();
    const currentYearMonth = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };

    const result = {
      fromYearMonth: parseYearMonth(credentialSubject.from),
      toYearMonth: credentialSubject.to
        ? parseYearMonth(credentialSubject.to)
        : currentYearMonth,
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getEmploymentPeriod end ***");
  }
};

/**
 * Career VC の在職期間が指定年数以上であるかを検証する。
 */
const validateEmploymentPeriodAtLeastYears = async (req, res) => {
  console.debug("*** validateEmploymentPeriodAtLeastYears start ***");

  try {
    const years = await getYearsFromParams(req);
    const vc = getVcFromRequest(req);
    const { fromYearMonth, toYearMonth } = await getEmploymentPeriod(vc);
    const valid = isYearMonthPeriodAtLeastYears(fromYearMonth, toYearMonth, years);

    const result = buildResult(
      valid,
      valid
        ? `Career VC employment period is at least ${years} years.`
        : `Career VC employment period is less than ${years} years.`,
      {
        policy: `career-employment-period-at-least-${years}-years`,
        checkedValue: {
          from: formatYearMonth(fromYearMonth),
          to: formatYearMonth(toYearMonth),
        },
      }
    );

    console.debug("result : ", result);

    return sendPolicyResult(res, result);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);

    if (error.message === "Invalid years parameter.") {
      return res.status(400).json({
        valid: false,
        message: "Invalid years parameter.",
      });
    }

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



