const presentationDefinitionRaw = presentationParams.get('presentation_definition');

let presentationDefinition = presentationDefinitionRaw;

if (presentationDefinitionRaw) {
  try {
    const pdObj = JSON.parse(presentationDefinitionRaw);

    // input_descriptors 内を動的にループ処理し、定義を修正
    if (pdObj.input_descriptors && Array.isArray(pdObj.input_descriptors)) {
      pdObj.input_descriptors.forEach(descriptor => {
        if (descriptor.constraints && descriptor.constraints.fields) {
          descriptor.constraints.fields.forEach(field => {
            
            // 修正対象となる 'pattern' フィルターが存在する場合のみ処理を実行
            if (field.filter && field.filter.pattern && Array.isArray(field.path)) {
              const originalValue = field.filter.pattern;

              // 配列内のいずれかの要素に指定のパスが含まれているかを検証 (.some を使用)
              const isJwtVc = field.path.some(p => p.includes("$.vc.type"));
              const isSdJwt = field.path.some(p => p.includes("$.vct"));

              // JWT-VC のタイプパス の場合
              if (isJwtVc) {
                field.filter = {
                  "type": "array",
                  "contains": {
                    "type": "string",
                    "const": originalValue
                  }
                };
              } 
              // SD-JWT のタイプパス の場合
              else if (isSdJwt) {
                field.filter = {
                  "type": "string",
                  "const": originalValue
                };
              }
            }

          });
        }
      });
    }

    // 修正したオブジェクトを再度シリアライズし、元の文字列型オブジェクトに戻す
    presentationDefinition = JSON.stringify(pdObj);

  } catch (error) {
    console.warn("presentation_definition の解析または修正に失敗しました。元の定義をそのまま使用します:", error);
    presentationDefinition = presentationDefinitionRaw;
  }
}
