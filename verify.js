# VPに異なるVCフォーマット（JWT／SD-JWT／mdoc）の混在に関する標準仕様
- 「異なるフォーマットのVCを混在させて同一VPを構築・提示すること」は OIDC／OAuth／W3Cのいずれの標準にも違反しません。むしろ OID4VP および DIF Presentation Exchange は、「混合形式のVCを含むVPを提示するケース」を正式に想定・許容しています。

## OpenID for Verifiable Presentations (OID4VP)
- [A VP Token contains one or more Verifiable Presentations and/or Presentations in the same or different Credential formats.](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
  - VP Token は 1 つまたは複数の Verifiable Presentation を含むことができ、それらのクレデンシャルフォーマットは同一でも異なっていてもよい。したがって、SD-JWT VC と JWT VC、さらには mdoc VC を混在させて提示することが標準的に許可されています。

## DIF Presentation Exchange
- [A Verifier's Presentation Definition and a Submission Requirements Object can describe a requirement met by credentials in multiple claim formats, and a Holder's agent can parse them and meet their requirements with a “mixed” Verifiable Presentation or other container that combines credentials in different claim formats, mapping claims to requirements with Embed Targets.](https://identity.foundation/presentation-exchange/)
  - Presentation Definition は複数のクレデンシャルフォーマットを参照することができ、Verifier は異なるフォーマットのVCを同時に要求することが可能であり、Holder も複数形式を混在させた VP を提出できる。つまり、JWT／SD-JWT／ISO mdoc などを同一VP内で組み合わせて提示することが想定されています。


## W3C Verifiable Credentials Data Model
- [Combine multiple verifiable credentials from multiple issuers into a single verifiable presentation without revealing verifiable credential or subject identifiers to the verifier. This makes it more difficult for the verifier to collude with any of the issuers regarding the issued verifiable credentials.](https://www.w3.org/TR/vc-data-model-1.1/)
  - Verifiable Presentation は、1つ以上の Verifiable Credential または他の Verifiable Presentation の集合体である。W3CのVCデータモデルは特定の署名形式（JWT／SD-JWT／JSON-LD／mdocなど）を限定していないため、異なるフォーマットのVCを1つのVPに含めることを妨げていません。

## まとめ

| 規格 | 異なるフォーマット混在に関する立場 | 補足 |
|------|--------------------|------|
| OID4VP | 明確に「同一VP内で異なるフォーマット可」 | 混在が標準仕様として許容されている |
| DIF Presentation Exchange | 異なるフォーマットを同時要求・提示可能 | Verifier 側が `presentation_definition` 内で受け入れ可能な `format` を宣言し、Wallet 側がそれに一致した形式で提示を返すことが前提 |
| W3C VC Data Model | データモデルのみを定義し、フォーマット非依存 | JSON-LD／JWT／SD-JWT／mdoc すべて合法的にVPに含め可能 |

