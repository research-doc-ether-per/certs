{/* 対象者入力 */}
{isAdminIssueMode && (
  <Grid item xs={12}>
    <Stack
      direction={{
        xs: 'column',
        sm: 'column',
        lg: 'row',
        xl: 'row',
      }}
      alignItems={{
        xs: 'stretch',
        sm: 'stretch',
        lg: 'flex-end',
        xl: 'flex-end',
      }}
      spacing={2}
    >
      {/* 対象者入力欄 */}
      <Stack
        flex={{
          xs: 1,
          sm: 1,
          lg: 3,
          xl: 3,
        }}
        width={{
          xs: '100%',
          sm: '100%',
        }}
      >
        {isAdminToIndividual && (
          <>
            <TextFieldLabel
              title="対象者"
              required
            />

            <CustomTextField
              name="targetUser"
              value={
                credentialForm.targetUser
              }
              onChange={handleChange}
              error={Boolean(
                inputErrors.targetUser
              )}
              helperText={
                inputErrors.targetUser
              }
              placeholder="対象者のIDを入力してください"
              inputProps={{
                maxLength: 64,
              }}
            />
          </>
        )}

        {isAdminToOrganization && (
          <>
            <TextFieldLabel
              title="組織ウォレット"
              required
            />

            <CustomTextArea
              name="targetUser"
              value={
                credentialForm.targetUser
              }
              onChange={handleChange}
              error={Boolean(
                inputErrors.targetUser
              )}
              helperText={
                inputErrors.targetUser
              }
              placeholder="組織ウォレットDIDを入力してください"
              minRows={3}
              maxRows={6}
              inputProps={{
                maxLength: 1024,
              }}
            />
          </>
        )}
      </Stack>

      {/* 操作ボタン */}
      <Stack
        flex={{
          xs: 1,
          sm: 1,
          lg: 1,
          xl: 1,
        }}
        width={{
          xs: '100%',
          sm: '100%',
          lg: 'auto',
          xl: 'auto',
        }}
        direction="column"
        justifyContent="flex-end"
        alignItems={{
          xs: 'stretch',
          sm: 'stretch',
          lg: 'flex-end',
          xl: 'flex-end',
        }}
        spacing={2}
      >
        <CustomButton
          onClick={handleAddUser}
          label="追加"
          disabled={
            Boolean(
              inputErrors.targetUser
            ) ||
            !credentialForm.targetUser
          }
          color="primary"
          variant="contained"
        />

        <CustomFileUploaderButton
          onChange={handleFileUpload}
          name="csv"
          label="アップロード"
          accept=".csv"
          color="primary"
          variant="contained"
        />
      </Stack>
    </Stack>

    {/* CSVアップロード時のエラー表示 */}
    {inputErrors.csv && (
      <Stack>
        <FormHelperText
          error
          sx={{ ml: 2 }}
        >
          {inputErrors.csv}
        </FormHelperText>
      </Stack>
    )}
  </Grid>
)}
