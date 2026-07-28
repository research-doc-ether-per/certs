  const { state, vpToken, userName, verifyResult } = requestBody

const response = await handlePost(url, accessToken, {
    state,
    vp_token: vpToken,
    user_id: userName,
    verify_result_string: JSON.stringify(verifyResult),
  })
