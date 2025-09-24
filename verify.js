<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vocabs for Custom Credentials VC</title>
  <style>
    body {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans";
      margin: 2rem auto;
      padding: 0 2rem 3rem;
      max-width: 960px;
      line-height: 1.6;
      background: #fdfdfd;
      color: #333;
    }
    h1 {
      font-size: 1.8rem;
      border-bottom: 3px solid #444;
      padding-bottom: 0.3rem;
    }
    h2 {
      margin-top: 2rem;
      font-size: 1.4rem;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      color: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    h2.global { background: #007acc; }
    h2.classes { background: #2d9d78; }
    h2.properties { background: #d9822b; }

    .meta {
      margin: 1rem 0;
      padding: 0.6rem 1rem;
      background: #f1f5f9;
      border-left: 4px solid #94a3b8;
      border-radius: 4px;
      font-size: 0.95rem;
      color: #475569;
    }

    .term {
      margin: 1.2rem 0;
      padding: 1rem 1.2rem;
      border-radius: 6px;
      background: #fafafa;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .term.global { border-left: 4px solid #3b82f6; }
    .term.class  { border-left: 4px solid #10b981; }
    .term.prop   { border-left: 4px solid #f59e0b; }

    .grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 0.4rem 1rem;
    }
    .grid .key {
      color: #666;
      font-weight: 500;
    }
    .iri {
      font-family: monospace;
      font-size: 0.95rem;
      color: #1e40af;
      word-break: break-all;
    }
    .iri a {
      color: #1e40af;
      text-decoration: none;
    }
    .iri a:hover {
      text-decoration: underline;
    }
    code {
      background: #f1f5f9;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>Vocabulary for Custom Credentials VC</h1>
  <p class="meta">
    Base namespace: <code>http://localhost:3000/vocab#</code><br/>
    JSON-LD definitions are provided in the head section and can be used by processors.
  </p>

  <h2 class="global">Global Properties</h2>
  <div class="term global" id="sub">
     <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#sub">http://localhost:3000/vocab#sub</a></div>
      <div class="key">Label</div><div>sub</div>
      <div class="key">Range</div><div class="iri"><a href="http://www.w3.org/2000/01/rdf-schema#Resource">rdfs:Resource</a></div>
      <div class="key">Comment</div><div>Subject identifier (JWT 'sub'), typically the holder's DID or another subject ID.</div>
    </div>
  </div>

   <div class="term global" id="_sd">
  <div class="grid">
    <div class="key">IRI</div>
    <div class="iri"><a href="http://localhost:3000/vocab#_sd">http://localhost:3000/vocab#_sd</a></div>
    <div class="key">Label</div><div>_sd</div>
    <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#json">xsd:json</a></div>
    <div class="key">Comment</div>
    <div>Array of hash digests representing selectively disclosable claims in SD-JWT.</div>
  </div>
</div>

<div class="term global" id="_sd_alg">
  <div class="grid">
    <div class="key">IRI</div>
    <div class="iri"><a href="http://localhost:3000/vocab#_sd_alg">http://localhost:3000/vocab#_sd_alg</a></div>
    <div class="key">Label</div><div>_sd_alg</div>
    <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#string">xsd:string</a></div>
    <div class="key">Comment</div>
    <div>Hash algorithm used for generating _sd digests.  
    Must accompany _sd when used, at any object level.</div>
  </div>

  <h2 class="classes">Classes</h2>
  <div class="term class" id="credentialInformation">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#credentialInformation">http://localhost:3000/vocab#credentialInformation</a></div>
      <div class="key">Type</div><div>rdfs:Class</div>
      <div class="key">Label</div><div>CredentialInformation</div>
      <div class="key">Comment</div><div>Container for credential-related claims within credentialSubject.</div>
    </div>
  </div>

  <div class="term class" id="CustomCredential">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#CustomCredential">http://localhost:3000/vocab#CustomCredential</a></div>
      <div class="key">Type</div><div>rdfs:Class</div>
      <div class="key">Label</div><div>CustomCredential</div>
      <div class="key">Comment</div><div>Base class indicating a custom credential. The concrete type is specified using the 'type' property in the VC.</div>
    </div>
  </div>

  <h2 class="properties">Properties</h2>
  <div class="term prop" id="certName">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#certName">http://localhost:3000/vocab#certName</a></div>
      <div class="key">Label</div><div>certName</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#string">xsd:string</a></div>
      <div class="key">Comment</div><div>Name or title of the credential.</div>
    </div>
  </div>

  <div class="term prop" id="certExplanation">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#certExplanation">http://localhost:3000/vocab#certExplanation</a></div>
      <div class="key">Label</div><div>certExplanation</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#string">xsd:string</a></div>
      <div class="key">Comment</div><div>Detailed explanation or description of the credential.</div>
    </div>
  </div>

  <div class="term prop" id="docId">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#docId">http://localhost:3000/vocab#docId</a></div>
      <div class="key">Label</div><div>docId</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#string">xsd:string</a></div>
      <div class="key">Comment</div><div>Internal identifier for the credential record.</div>
    </div>
  </div>

  <div class="term prop" id="organization">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#organization">http://localhost:3000/vocab#organization</a></div>
      <div class="key">Label</div><div>organization</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#string">xsd:string</a></div>
      <div class="key">Comment</div><div>Name of the organization issuing or accrediting the credential.</div>
    </div>
  </div>

  <div class="term prop" id="image">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="https://schema.org/image">https://schema.org/image</a></div>
      <div class="key">Label</div><div>image</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://schema.org/URL">schema:URL</a></div>
      <div class="key">Comment</div><div>URL of an image related to the credential (e.g., logo or certificate image).</div>
    </div>
  </div>

  <div class="term prop" id="issuanceDate">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="https://www.w3.org/2018/credentials#issuanceDate">https://www.w3.org/2018/credentials#issuanceDate</a></div>
      <div class="key">Label</div><div>issuanceDate</div>
         <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#dateTime">xsd:dateTime</a></div>
      <div class="key">Comment</div><div>Date when the credential was issued.</div>
    </div>
  </div>

  <div class="term prop" id="expirationDate">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="https://www.w3.org/2018/credentials#expirationDate">https://www.w3.org/2018/credentials#expirationDate</a></div>
      <div class="key">Label</div><div>expirationDate</div>
         <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#dateTime">xsd:dateTime</a></div>
      <div class="key">Comment</div><div>Date when the credential expires, if applicable.</div>
    </div>
  </div>

  <div class="term prop" id="issuedAt">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#issuedAt">http://localhost:3000/vocab#issuedAt</a></div>
      <div class="key">Label</div><div>issuedAt</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#date">xsd:date</a></div>
      <div class="key">Comment</div><div>Date when the credential was formally awarded or granted.</div>
    </div>
  </div>

  <div class="term prop" id="category">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#category">http://localhost:3000/vocab#category</a></div>
      <div class="key">Label</div><div>category</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#string">xsd:string</a></div>
      <div class="key">Comment</div><div>Category or classification relevant to the credential (e.g., sales, engineering, academic field).</div>
    </div>
  </div>

  <div class="term prop" id="position">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="http://localhost:3000/vocab#position">http://localhost:3000/vocab#position</a></div>
      <div class="key">Label</div><div>position</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#string">xsd:string</a></div>
      <div class="key">Comment</div><div>Position, title, or role associated with the credential (e.g., director, professor).</div>
    </div>
  </div>

  <div class="term prop" id="from">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="https://schema.org/startDate">https://schema.org/startDate</a></div>
      <div class="key">Label</div><div>from</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#date">xsd:date</a></div>
      <div class="key">Comment</div><div>Start date relevant to the credential period (e.g., start of employment or award).</div>
    </div>
  </div>

  <div class="term prop" id="to">
    <div class="grid">
      <div class="key">IRI</div><div class="iri"><a href="https://schema.org/endDate">https://schema.org/endDate</a></div>
      <div class="key">Label</div><div>to</div>
      <div class="key">Domain</div><div>credentialInformation</div>
      <div class="key">Range</div><div class="iri"><a href="https://www.w3.org/2001/XMLSchema#date">xsd:date</a></div>
      <div class="key">Comment</div><div>End date relevant to the credential period (e.g., end of employment or award).</div>
    </div>
  </div>
</body>
</html>
