const verificationCredentialDataList = [
  {
    credentialType: 'Awards',
    format: 'jwt_vc_json',
    expectedResult: true,
    credentialData: {
      credentialSubject: {
        certName: 'Awards_JWT_VERIFICATION_TRUE',
        certExplanation: 'JWT VC 用。regex / issuedAt format / date-within policy の正常系確認用。',
        image: null,
        organization: 'awards-jwt-verification-true-org',
        issuedAt: '2025/10/01',
      },
    },
  },
  {
    credentialType: 'Awards',
    format: 'jwt_vc_json',
    expectedResult: false,
    credentialData: {
      credentialSubject: {
        certName: 'Awards_JWT_VERIFICATION_FALSE',
        certExplanation: 'JWT VC 用。regex / issuedAt format / date-within policy の異常系確認用。',
        image: null,
        organization: 'awards-jwt-verification-false-org',
        issuedAt: '2020/10/01',
      },
    },
  },
  {
    credentialType: 'Awards',
    format: 'dc+sd-jwt',
    expectedResult: true,
    credentialData: {
      vct: 'http://10.0.2.15:3200/vct/Awards',
      'vct#integrity': 'sha256-xxxxxxxx',
      credentialSubject: {
        certName: 'Awards_SD_JWT_VERIFICATION_TRUE',
        certExplanation: 'SD-JWT VC 用。Awards issuedAt webhook policy 正常系、および vct-integrity policy 確認用。',
        image: null,
        organization: 'awards-sdjwt-verification-true-org',
        issuedAt: '2025/10/01',
      },
    },
    selectiveDisclosure: {
      fields: {
        credentialSubject: {
          sd: false,
          children: {
            fields: {
              organization: { sd: true },
              issuedAt: { sd: true },
            },
          },
        },
      },
    },
  },
  {
    credentialType: 'Awards',
    format: 'dc+sd-jwt',
    expectedResult: false,
    credentialData: {
      vct: 'http://10.0.2.15:3200/vct/Awards',
      'vct#integrity': 'sha256-xxxxxxxx',
      credentialSubject: {
        certName: 'Awards_SD_JWT_VERIFICATION_FALSE',
        certExplanation: 'SD-JWT VC 用。Awards issuedAt webhook policy 異常系、および vct-integrity policy 確認用。',
        image: null,
        organization: 'awards-sdjwt-verification-false-org',
        issuedAt: '2020/10/01',
      },
    },
    selectiveDisclosure: {
      fields: {
        credentialSubject: {
          sd: false,
          children: {
            fields: {
              organization: { sd: true },
              issuedAt: { sd: true },
            },
          },
        },
      },
    },
  },
  {
    credentialType: 'Career',
    format: 'jwt_vc_json',
    expectedResult: true,
    credentialData: {
      credentialSubject: {
        certName: 'Career_JWT_VERIFICATION_TRUE',
        certExplanation: 'JWT VC 用。category / position regex policy、および schema policy の正常系確認用。',
        image: null,
        organization: 'test02',
        type: 'business-career-jwt',
        category: 'sales',
        position: 'director',
        from: '2020/10',
        to: '2025/10',
      },
    },
  },
  {
    credentialType: 'Career',
    format: 'jwt_vc_json',
    expectedResult: false,
    credentialData: {
      credentialSubject: {
        certName: 'Career_JWT_VERIFICATION_FALSE',
        certExplanation: 'JWT VC 用。position regex policy の異常系確認用。',
        image: null,
        organization: 'test02',
        type: 'business-career-jwt',
        category: 'sales',
        position: 'staff',
        from: '2020/10',
        to: '2025/10',
      },
    },
  },
  {
    credentialType: 'Career',
    format: 'dc+sd-jwt',
    expectedResult: true,
    credentialData: {
      vct: 'http://10.0.2.15:3200/vct/Career',
      'vct#integrity': 'sha256-xxxxxxxx',
      credentialSubject: {
        certName: 'Career_SD_JWT_VERIFICATION_TRUE',
        certExplanation: 'SD-JWT VC 用。Career employment-period webhook policy 正常系、および vct-integrity policy 確認用。',
        image: null,
        organization: 'test03',
        type: 'business-career-sdjwt',
        category: 'engineering',
        position: 'manager',
        from: '2020/10',
        to: '2025/10',
      },
    },
    selectiveDisclosure: {
      fields: {
        credentialSubject: {
          sd: false,
          children: {
            fields: {
              category: { sd: true },
              position: { sd: true },
            },
          },
        },
      },
    },
  },
  {
    credentialType: 'Career',
    format: 'dc+sd-jwt',
    expectedResult: false,
    credentialData: {
      vct: 'http://10.0.2.15:3200/vct/Career',
      'vct#integrity': 'sha256-xxxxxxxx',
      credentialSubject: {
        certName: 'Career_SD_JWT_VERIFICATION_FALSE',
        certExplanation: 'SD-JWT VC 用。Career employment-period webhook policy 異常系、および vct-integrity policy 確認用。',
        image: null,
        organization: 'test03',
        type: 'business-career-sdjwt',
        category: 'engineering',
        position: 'manager',
        from: '2025/10',
        to: '2026/10',
      },
    },
    selectiveDisclosure: {
      fields: {
        credentialSubject: {
          sd: false,
          children: {
            fields: {
              category: { sd: true },
              position: { sd: true },
            },
          },
        },
      },
    },
  },
  {
    credentialType: 'Qualification',
    format: 'jwt_vc_json',
    expectedResult: true,
    credentialData: {
      credentialSubject: {
        certName: 'Qualification_JWT_VERIFICATION_TRUE',
        certExplanation: 'JWT VC 用。issuedAt date-within policy の正常系確認用。',
        image: null,
        organization: 'qualification-jwt-verification-true-org',
        type: 'qualifications',
        issuedAt: '2025/10/01',
      },
    },
  },
  {
    credentialType: 'Qualification',
    format: 'jwt_vc_json',
    expectedResult: false,
    credentialData: {
      credentialSubject: {
        certName: 'Qualification_JWT_VERIFICATION_FALSE',
        certExplanation: 'JWT VC 用。issuedAt date-within policy の異常系確認用。',
        image: null,
        organization: 'qualification-jwt-verification-false-org',
        type: 'qualifications',
        issuedAt: '2020/10/01',
      },
    },
  },
];
