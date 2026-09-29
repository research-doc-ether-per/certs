/**
 * URL パラメータから年数を取得する
 */
const getYearsFromParams = (yearsValue) => {
  console.debug("*** getYearsFromParams start ***");

  try {
    const years = Number(yearsValue);

    if (!Number.isInteger(years) || years <= 0) {
      throw new Error(`Invalid years parameter: ${yearsValue}`);
    }

    console.debug("years : ", years);

    return years;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** getYearsFromParams end ***");
  }
};

module.exports = {
  getYearsFromParams,
};
