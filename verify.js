const express = require("express");
const AwardsService = require("./src/services/AwardsService");
const CareerService = require("./src/services/CareerService");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

// 死活確認用のエンドポイント
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Awards VC：表彰日（issuedAt）が指定年数以内であることを検証する
app.post(
  "/webhook/awards/issued-at/within-:years-years",
  AwardsService.validateIssuedAtWithinYears
);

// Career VC：在職期間（from ～ to）が指定年数以上であることを検証する
app.post(
  "/webhook/career/employment-period/at-least-:years-years",
  CareerService.validateEmploymentPeriodAtLeastYears
);

// 未定義のエンドポイントにアクセスした場合
app.use((req, res) => {
  res.status(404).json({
    valid: false,
    message: "Endpoint not found.",
  });
});

app.listen(PORT, () => {
  console.log(`Custom verification webhook server is running on port: ${PORT}`);
});



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




const { parseDate, isPeriodAtLeastYears } = require("../utils/dateUtils");
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
 * from：在職開始日
 * to：在職終了日
 *
 * to が存在しない場合は、現在も在職中として現在日時を使用する。
 */
const getEmploymentPeriod = async (vc) => {
  console.debug("*** getEmploymentPeriod start ***");

  try {
    const credentialSubject = getCredentialSubject(vc);

    const result = {
      fromDate: parseDate(credentialSubject.from),
      toDate: parseDate(credentialSubject.to || new Date()),
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
    const { fromDate, toDate } = await getEmploymentPeriod(vc);
    const valid = isPeriodAtLeastYears(fromDate, toDate, years);

    const result = buildResult(
      valid,
      valid
        ? `Career VC employment period is at least ${years} years.`
        : `Career VC employment period is less than ${years} years.`,
      {
        policy: `career-employment-period-at-least-${years}-years`,
        checkedValue: {
          from: fromDate ? fromDate.toISOString() : null,
          to: toDate ? toDate.toISOString() : null,
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

/**
 * 日付項目を Date 型に変換する。
 *
 * 文字列の場合：Date として変換する。
 * 数値の場合：JWT の iat などを想定し、Unix timestamp 秒として変換する。
 */
function parseDate(value) {
  if (!value) return null;

  if (typeof value === "number") {
    return new Date(value * 1000);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 対象日が現在から指定年数以内であるかを判定する。
 */
function isWithinYears(targetDate, years) {
  if (!targetDate) return false;

  const now = new Date();
  const threshold = new Date(now);
  threshold.setFullYear(now.getFullYear() - years);

  return targetDate >= threshold && targetDate <= now;
}

/**
 * from ～ to の期間が指定年数以上であるかを判定する。
 */
function isPeriodAtLeastYears(fromDate, toDate, years) {
  if (!fromDate || !toDate) return false;

  const threshold = new Date(fromDate);
  threshold.setFullYear(threshold.getFullYear() + years);

  return toDate >= threshold;
}

module.exports = {
  parseDate,
  isWithinYears,
  isPeriodAtLeastYears,
};


/**
 * URL パラメータから年数を取得する。
 */
const getYearsFromParams = async (req) => {
  console.debug("*** getYearsFromParams start ***");

  try {
    const years = Number(req.params.years);

    if (!Number.isInteger(years) || years <= 0) {
      throw new Error("Invalid years parameter.");
    }

    const result = years;
    console.debug("result : ", result);

    return result;
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


/**
 * Verifier API 2 の webhook policy から送信される VC データを取得する。
 *
 * リクエスト形式が環境やバージョンによって異なる可能性があるため、
 * vc / credential / verifiableCredential / body 全体の順で確認する。
 */
function getVcFromRequest(req) {
  return (
    req.body.vc ||
    req.body.credential ||
    req.body.verifiableCredential ||
    req.body
  );
}

/**
 * VC から credentialSubject を取得する。
 *
 * 通常の VC 形式だけでなく、JWT VC の payload に含まれる vc.credentialSubject も考慮する。
 */
function getCredentialSubject(vc) {
  if (!vc) return {};

  return (
    vc.credentialSubject ||
    vc.vc?.credentialSubject ||
    vc.credential?.credentialSubject ||
    {}
  );
}

/**
 * webhook policy の検証結果レスポンスを作成する。
 */
function buildResult(valid, message, detail = {}) {
  return {
    valid,
    message,
    ...detail,
  };
}

/**
 * 検証結果を返却する。
 *
 * Verifier 側では HTTP status code により policy の成功／失敗を判定する想定のため、
 * 検証成功時は 200、検証失敗時は 400 を返す。
 */
function sendPolicyResult(res, result) {
  return res.status(result.valid ? 200 : 400).json(result);
}

module.exports = {
  getVcFromRequest,
  getCredentialSubject,
  buildResult,
  sendPolicyResult,
};






