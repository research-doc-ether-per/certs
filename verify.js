const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = "Asia/Tokyo";

/**
 * Awards VC の issuedAt を解析する
 *
 * 形式：YYYY/MM/DD
 * 例：2022/09/01
 */
const parseIssuedAt = (value) => {
  console.debug("*** parseIssuedAt start ***");

  try {
    if (!value) {
      return null;
    }

    const parsedDate = dayjs.tz(value, "YYYY/MM/DD", TIMEZONE);

    if (!parsedDate.isValid()) {
      return null;
    }

    return parsedDate;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** parseIssuedAt end ***");
  }
};

/**
 * Career VC の from / to を解析する
 *
 * 形式：YYYY/MM
 * 例：2020/04
 */
const parseYearMonth = (value) => {
  console.debug("*** parseYearMonth start ***");

  try {
    if (!value) {
      return null;
    }

    const parsedDate = dayjs.tz(value, "YYYY/MM", TIMEZONE);

    if (!parsedDate.isValid()) {
      return null;
    }

    return parsedDate;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** parseYearMonth end ***");
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
 * 例：
 * from: 2020/04
 * to  : 2023/03
 * => 36か月として扱う
 */
const isPeriodAtLeastYears = (fromDate, toDate, years) => {
  console.debug("*** isPeriodAtLeastYears start ***");

  try {
    if (!fromDate || !toDate || !years) {
      return false;
    }

    const requiredMonths = years * 12;

    const diffMonths = toDate.diff(fromDate, "month") + 1;

    const result = diffMonths >= requiredMonths;

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
const formatDate = (date) => {
  console.debug("*** formatDate start ***");

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
    console.debug("*** formatDate end ***");
  }
};

/**
 * dayjs オブジェクトを YYYY/MM 形式に変換する
 */
const formatYearMonth = (date) => {
  console.debug("*** formatYearMonth start ***");

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
    console.debug("*** formatYearMonth end ***");
  }
};

module.exports = {
  parseIssuedAt,
  parseYearMonth,
  getCurrentDate,
  getCurrentYearMonth,
  isWithinYears,
  isPeriodAtLeastYears,
  formatDate,
  formatYearMonth,
};
