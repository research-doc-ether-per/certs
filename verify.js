return {
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      validFromDate: cert.validFromDate,
      validToDate: cert.validToDate,
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      fingerprint256: cert.fingerprint256,
      fingerprint512: cert.fingerprint512,
      keyUsage: cert.keyUsage,
      subjectAltName: cert.subjectAltName,
      infoAccess: cert.infoAccess
    }
