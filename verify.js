
router.get(
  '/issuers/:issuer_did(*)/bsl/vcUrls/:vc_url(*)/credential/jwt',
  trqpController.getBSLVCJwt
);

export const getBSLVCJwt = async (req: Request, res: Response) => {
  log.debug({ message: `Request( ${req.ip} ): ${req.method} ${req.path}` });

  try {
    const vc_url = req.params.vc_url;

    const jwt = await trqpModel.getCredentialJwt(vc_url);

    log.info(jwt);

    res
      .status(200)
      .type('application/statuslist+jwt')
      .send(jwt);
  } catch (e: any) {
    console.error('e.stack: ', e.stack);

    const errorResponse = { message: e.message };
    log.error(errorResponse);

    res.status(e?.status || 500).json(errorResponse);
  }
};


// import { createStatusListJwt } from '../utils/proof';

export const getCredentialJwt = async (
  status_list_credential_url: string
): Promise<string> => {
  const credential = await getCredential(status_list_credential_url);

  return await createStatusListJwt(
    credential,
    credential.issuer
  );
};


