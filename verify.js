const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = "Asia/Tokyo";

/**
 * YYYY/MM/DD 形式の日付文字列を dayjs オブジェクトに変換する
 *
 * 例：2022/09/01
 */
const parseYYYYMMDD = (value) => {
  console.debug("*** parseYYYYMMDD start ***");

  try {
    if (!value) {
      return null;
    }

    const result = dayjs.tz(value, "YYYY/MM/DD", TIMEZONE, true);

    if (!result.isValid()) {
      return null;
    }

    console.debug("result : ", result.format("YYYY/MM/DD"));
    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** parseYYYYMMDD end ***");
  }
};

/**
 * YYYY/MM 形式の年月文字列を dayjs オブジェクトに変換する
 *
 * 例：2020/04
 */
const parseYYYYMM = (value) => {
  console.debug("*** parseYYYYMM start ***");

  try {
    if (!value) {
      return null;
    }

    const result = dayjs.tz(value, "YYYY/MM", TIMEZONE, true);

    if (!result.isValid()) {
      return null;
    }

    console.debug("result : ", result.format("YYYY/MM"));
    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** parseYYYYMM end ***");
  }
};

/**
 * 現在日付を日本時間で取得する
 */
const getCurrentDate = () => {
  console.debug("*** getCurrentDate start ***");

  try {
    const result = dayjs().tz(TIMEZONE);

    console.debug("result : ", result.format("YYYY/MM/DD"));
    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getCurrentDate end ***");
  }
};

/**
 * 現在年月を日本時間で取得する
 */
const getCurrentYearMonth = () => {
  console.debug("*** getCurrentYearMonth start ***");

  try {
    const result = dayjs().tz(TIMEZONE).startOf("month");

    console.debug("result : ", result.format("YYYY/MM"));
    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getCurrentYearMonth end ***");
  }
};

/**
 * 指定日が現在日付から指定年数以内かどうかを判定する
 */
const isWithinYears = (targetDate, years) => {
  console.debug("*** isWithinYears start ***");

  try {
    if (!targetDate || !years) {
      return false;
    }

    const currentDate = getCurrentDate();
    const thresholdDate = currentDate.subtract(years, "year");

    const result =
      targetDate.isSame(thresholdDate, "day") ||
      targetDate.isAfter(thresholdDate, "day");

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
 * from ～ to の期間が指定年数以上かどうかを判定する
 *
 * from / to は YYYY/MM 形式のため、月単位で判定する。
 */
const isPeriodAtLeastYears = (fromDate, toDate, years) => {
  console.debug("*** isPeriodAtLeastYears start ***");

  try {
    if (!fromDate || !toDate || !years) {
      return false;
    }

    const requiredMonths = years * 12;
    const actualMonths = toDate.diff(fromDate, "month") + 1;

    const result = actualMonths >= requiredMonths;

    console.debug("actualMonths : ", actualMonths);
    console.debug("requiredMonths : ", requiredMonths);
    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** isPeriodAtLeastYears end ***");
  }
};

/**
 * dayjs オブジェクトを YYYY/MM/DD 形式に変換する
 */
const formatYYYYMMDD = (date) => {
  console.debug("*** formatYYYYMMDD start ***");

  try {
    if (!date) {
      return null;
    }

    const result = date.tz(TIMEZONE).format("YYYY/MM/DD");

    console.debug("result : ", result);
    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** formatYYYYMMDD end ***");
  }
};

/**
 * dayjs オブジェクトを YYYY/MM 形式に変換する
 */
const formatYYYYMM = (date) => {
  console.debug("*** formatYYYYMM start ***");

  try {
    if (!date) {
      return null;
    }

    const result = date.tz(TIMEZONE).format("YYYY/MM");

    console.debug("result : ", result);
    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** formatYYYYMM end ***");
  }
};

module.exports = {
  parseYYYYMMDD,
  parseYYYYMM,
  getCurrentDate,
  getCurrentYearMonth,
  isWithinYears,
  isPeriodAtLeastYears,
  formatYYYYMMDD,
  formatYYYYMM,
};


const { parseYYYYMMDD, isWithinYears } = require("../utils/dateUtils");
const { getCredentialSubject } = require("../utils/vcUtils");

/**
 * Awards VC の表彰日が指定年数以内かどうかを検証する
 */
const validateIssuedAtWithinYears = async (vc, years) => {
  console.debug("*** validateIssuedAtWithinYears start ***");

  try {
    const credentialSubject = getCredentialSubject(vc);

    const issuedAtValue = credentialSubject.issuedAt;
    const issuedAt = parseYYYYMMDD(issuedAtValue);

    const result = {
      valid: isWithinYears(issuedAt, years),
      message: isWithinYears(issuedAt, years)
        ? `Awards VC issuedAt is within ${years} years.`
        : `Awards VC issuedAt is not within ${years} years.`,
      policy: `awards-issued-at-within-${years}-years`,
      checkedValue: issuedAtValue || null,
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
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
const { getCredentialSubject } = require("../utils/vcUtils");

/**
 * Career VC の在職期間が指定年数以上かどうかを検証する
 */
const validateEmploymentPeriodAtLeastYears = async (vc, years) => {
  console.debug("*** validateEmploymentPeriodAtLeastYears start ***");

  try {
    const credentialSubject = getCredentialSubject(vc);

    console.debug("credentialSubject : ", credentialSubject);

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

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** validateEmploymentPeriodAtLeastYears end ***");
  }
};

module.exports = {
  validateEmploymentPeriodAtLeastYears,
};
